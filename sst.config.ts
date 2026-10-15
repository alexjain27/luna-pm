/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "luna-pm",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
    };
  },
  async run() {
    // Private network for the database. The NAT instance gives the app outbound
    // internet (SMTP, S3) and doubles as the bastion for `sst tunnel`.
    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2", bastion: true });

    const database = new sst.aws.Postgres("Database", {
      vpc,
      database: "luna_pm",
      // `sst dev` uses the local Postgres from docker-compose.yml instead.
      dev: {
        username: "luna",
        password: "luna",
        database: "luna_pm",
        port: 5433,
      },
    });

    const bucket = new sst.aws.Bucket("Assets", {
      // No public access — all reads go through presigned URLs
      access: "none",
    });

    const nextAuthSecret = new sst.Secret("NextAuthSecret");
    const emailServer = new sst.Secret("EmailServer");
    const emailFrom = new sst.Secret("EmailFrom");

    const databaseUrl = $resolve([
      database.username,
      database.password,
      database.host,
      database.port,
      database.database,
    ]).apply(([username, password, host, port, name]) => {
      const local = host === "localhost";
      const params = local ? "" : "?sslmode=require&connection_limit=1";
      return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${name}${params}`;
    });

    const web = new sst.aws.Nextjs("Web", {
      vpc,
      link: [bucket],
      environment: {
        DATABASE_URL: databaseUrl,
        S3_BUCKET: bucket.name,
        NEXTAUTH_SECRET: nextAuthSecret.value,
        // NextAuth derives its URL from the request's forwarded host.
        AUTH_TRUST_HOST: "true",
        EMAIL_SERVER: emailServer.value,
        EMAIL_FROM: emailFrom.value,
      },
    });

    return {
      url: web.url,
      bucketName: bucket.name,
    };
  },
});
