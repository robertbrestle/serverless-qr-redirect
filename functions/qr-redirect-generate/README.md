# QR Redirect Generator

This serverless project creates an S3 bucket with a trigger to a Lambda function responsible for generating QR codes and their associated rediects.

## Prerequisites
- AWS account with suitable permissions  
- [awscli](https://aws.amazon.com/cli/) installed and configured with your access keys  
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) and [NodeJS 18](https://nodejs.org) installed  

## Setup
1. Run `npm install`  
2. Modify `serverless.yml` values:  
  - `provider.iam.role.statements[2].Resource` = your S3 bucket ARN  
  - `functions.generate.events.s3.bucket` = your S3 bucket name  
  - `functions.generate.environment.S3_BUCKET` = your S3 bucket name  
  - `functions.generate.SITE_IDS` = your comma-separated site identifiers (the order must match `SITE_HOSTNAMES`)  
  - `functions.generate.SITE_HOSTNAMES` = your comma-separated site hostnames (the order must match `SITE_IDS`)  
3. Run `serverless deploy`  
4. Run `aws s3api put-object --bucket YOUR_S3_BUCKET --key "input/" --content-length 0` to create the `input/` folder  

### Serve QR code images through CloudFront \[optional\]

Following the setup steps, you can generate redirects and download QR code SVGs for usage. To make this easier, you can use CloudFront to 

Origin:  
Origin domain = your S3 bucket  
Origin path = `/images`  
Origin access = [set up Origin access control with your S3 bucket](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)  

Behavior:  
Path pattern = `/qr-images/*`  
Origin and origin groups = the origin above  
Viewer protocol policy = Redirect HTTP to HTTPS  
Allowed HTTP methods = GET, HEAD  
Cache key and origin requests = CachingOptimized  

## Testing

Copy input file to `input/`  
`aws s3 cp example/example-input.csv s3://YOUR_S3_BUCKET/input/`  

If setup correctly, the `mappings/`, `images/`, and `output/` folder should be created and populated.

## Invoke Locally
`serverless invoke local -f generate -p example/example-event.json`  

&nbsp;
