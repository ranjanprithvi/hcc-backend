import { STS } from "@aws-sdk/client-sts";

const sts = new STS({
    region: "ap-south-1",
});

const params = {
    RoleArn: "arn:aws:iam::198427895279:role/Access_HCCBucket",
    RoleSessionName: "HCCFullAccessSession",
    DurationSeconds: 60 * 60 * 12,
};

export const getCredentials = async () => {
    let res = await sts.assumeRole(params);
    return res.Credentials;
};

getCredentials();
