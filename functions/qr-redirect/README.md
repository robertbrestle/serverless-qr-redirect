# QR Redirect

This serverless project creates a Lambda@Edge function for a CloudFront origin response to handle redirects.  

## Prerequisites
- AWS account with suitable permissions  
- [awscli](https://aws.amazon.com/cli/) installed and configured with your access keys  
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and [NodeJS 18](https://nodejs.org) installed  
- an existing CloudFront distribution  

## Setup CloudFront Distribution

1. [Create a distribution, add custom domain, add SSL](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-creating-console.html)  
2. Create new Origin
  - Set origin as your redirect S3 bucket  
  - [set up Origin access control with your S3 bucket](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)  
  - Add custom header  
    - X-Hostname = your custom domain name  
    - Exmaple: `X-Hostname = www.example.com`  
3. Create new Behavior  
  - Path pattern = `/qr/*`  
  - Origin = the origin above  
  - Viewer protocol policy = Redirect HTTP to HTTPS  
  - Allowed HTTP methods = GET, HEAD  
  - Cache key and origin requests = CachingOptimized  

## Deploy Lambda

1. Run `npm install`  
2. Modify `serverless.yml` values:  
  - `provider.iam.role.statements[2].Resource` = your S3 bucket ARN  
3. Modify `config.json` values:  
  - `S3.Bucket` = your S3 bucket name  
  - `SiteIdMapping.*` = your domain to site identifier mappings  
4. Run `serverless deploy`  

## Update Lambda@Edge IAM Role

1. Open the Lambda@Edge IAM Role in the AWS console  
  - `qr-redirect-lambda-iam-role`  
2. Open the **Trust relationships** tab and click **Edit trust policy**  
3. Update the policy with the following JSON:  
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "lambda.amazonaws.com",
          "edgelambda.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```
4. Click **Update policy**  

[More information](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-permissions.html)

## Setup Lambda@Edge Origin Response Trigger

1. Open your Lambda@Edge function in the AWS console  
2. Open the **Versions** tab  
3. Click the latest Version number  
4. Click **Add Trigger**  
  - Trigger configuration = CloudFront  
  - Configure new CloudFront trigger = selected  
  - Distribution = select your existing distribution  
  - Cache behavior = `/qr/*`  
  - CloudFront event = Origin Response  
  - Confirm deploy to Lambda@Edge = selected  
  - Click **Add**  

Once the Lambda@Edge replica has been deployed, it should be active.  

## Request Event

Please reference [example/example-event.json](example/example-event.json)

Notable parts of this request:  
- `Records[0].cf.request.headers.x-hostname` = the `value` should match up to an allowed domain  
- `Records[0].cf.request.origin.uri` = the request path as `/qr/MY_REDIRECT_KEY`. The `/qr/` will be replaced with `mappings/MY_SITE_ID/MY_REDIRECT_KEY.json` to find the mapping in the S3 bucket  

## Response Event

`response.status` = the redirect status code  
`response.statusDescription` = the redirect status description  
`response.headers.location[0].value` = the redirect destination  

```
{
    "status": 301,
    "statusDescription": "Moved Permanently",
    "headers": {
        "access-control-allow-credentials": [
            {
                "key": "Access-Control-Allow-Credentials",
                "value": "true"
            }
        ],
        "access-control-allow-origin": [
            {
                "key": "Access-Control-Allow-Origin",
                "value": "*"
            }
        ],
        "date": [
            {
                "key": "Date",
                "value": "Mon, 13 Jan 2020 20:12:38 GMT"
            }
        ],
        "referrer-policy": [
            {
                "key": "Referrer-Policy",
                "value": "no-referrer-when-downgrade"
            }
        ],
        "server": [
            {
                "key": "Server",
                "value": "ExampleCustomOriginServer"
            }
        ],
        "x-content-type-options": [
            {
                "key": "X-Content-Type-Options",
                "value": "nosniff"
            }
        ],
        "x-frame-options": [
            {
                "key": "X-Frame-Options",
                "value": "DENY"
            }
        ],
        "x-xss-protection": [
            {
                "key": "X-XSS-Protection",
                "value": "1; mode=block"
            }
        ],
        "content-type": [
            {
                "key": "Content-Type",
                "value": "text/html; charset=utf-8"
            }
        ],
        "content-length": [
            {
                "key": "Content-Length",
                "value": "9593"
            }
        ],
        "strict-transport-security": [
            {
                "key": "Strict-Transport-Security",
                "value": "max-age=63072000"
            }
        ],
        "location": [
            {
                "key": "Location",
                "value": "https://www.example.com/this/is/a/test.html?utm_source=qr-code"
            }
        ]
    }
}
```

## Invoke Locally
`serverless invoke local -f redirect -p example/example-event.json`

## References
- [URL redirection with AWS Lambda@Edge](https://blog.cavelab.dev/2021/06/aws-lambda-edge-redirect/)  
- [Lambda@Edge event structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html)  

&nbsp;
