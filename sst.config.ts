/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "luna-pm",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"],
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("Assets", {
      // No public access — all reads go through presigned URLs
      access: "none",
    });

    return {
      bucketName: bucket.name,
    };
  },
});
