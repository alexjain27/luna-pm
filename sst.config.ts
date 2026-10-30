/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "luna-pm",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: { aws: { region: "us-west-2" } },
    };
  },
  async run() {
    // The database is Neon serverless Postgres, outside AWS. DatabaseUrl holds the
    // branch's connection string for this stage (direct or pooled, either works).
    const databaseUrlSecret = new sst.Secret("DatabaseUrl");
    const nextAuthSecret = new sst.Secret("NextAuthSecret");
    const emailServer = new sst.Secret("EmailServer");
    const emailFrom = new sst.Secret("EmailFrom");

    const databaseUrl = databaseUrlSecret.value.apply((raw) => {
      const direct = new URL(raw);
      const [endpoint, ...domain] = direct.hostname.split(".");
      direct.hostname = [endpoint.replace(/-pooler$/, ""), ...domain].join(".");

      // The app goes through Neon's PgBouncer pooler, one connection per Lambda,
      // with a timeout long enough to wake a suspended compute.
      const pooled = new URL(direct);
      pooled.hostname = [`${endpoint.replace(/-pooler$/, "")}-pooler`, ...domain].join(".");
      pooled.searchParams.delete("channel_binding");
      pooled.searchParams.set("sslmode", "require");
      pooled.searchParams.set("pgbouncer", "true");
      pooled.searchParams.set("connection_limit", "1");
      pooled.searchParams.set("connect_timeout", "15");

      return { direct: direct.toString(), pooled: pooled.toString() };
    });

    // Private by default — all reads go through presigned URLs
    const bucket = new sst.aws.Bucket("Assets");

    const web = new sst.aws.Nextjs("Web", {
      link: [bucket],
      environment: {
        DATABASE_URL: databaseUrl.pooled,
        S3_BUCKET: bucket.name,
        NEXTAUTH_SECRET: nextAuthSecret.value,
        // NextAuth derives its URL from the request's forwarded host.
        AUTH_TRUST_HOST: "true",
        EMAIL_SERVER: emailServer.value,
        EMAIL_FROM: emailFrom.value,
      },
    });

    // Nightly pg_dump to S3, independent of Neon's own restore history.
    // Runs as a Fargate task in public subnets: no NAT, so the VPC costs nothing.
    const backups = new sst.aws.Bucket("Backups", {
      lifecycle: [{ id: "expire-backups", expiresIn: "30 days" }],
    });

    const vpc = new sst.aws.Vpc("Vpc");
    const cluster = new sst.aws.Cluster("Cluster", { vpc });

    const backup = new sst.aws.Task("Backup", {
      cluster,
      link: [backups],
      // pg_dump must be at least the server's major version.
      image: "public.ecr.aws/docker/library/postgres:18-alpine",
      entrypoint: ["sh", "-c"],
      command: [
        [
          "set -eo pipefail",
          "apk add --no-cache aws-cli > /dev/null",
          'key="backups/$(date -u +%Y-%m-%dT%H%M%SZ).dump"',
          'pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" | aws s3 cp - "s3://$BACKUP_BUCKET/$key"',
          'echo "Backed up to s3://$BACKUP_BUCKET/$key"',
        ].join("; "),
      ],
      environment: {
        DATABASE_URL: databaseUrl.direct,
        BACKUP_BUCKET: backups.name,
      },
      dev: false,
    });

    new sst.aws.Cron("BackupSchedule", {
      // 10:00 UTC = 2–3am Pacific
      schedule: "cron(0 10 * * ? *)",
      task: backup,
    });

    return {
      url: web.url,
      bucketName: bucket.name,
      backupBucketName: backups.name,
    };
  },
});
