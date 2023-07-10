# Terraform Static Website/Blog Infrastructure

This repository contains a sample infrastructure as code (IaC) using Terraform to host a static website/blog. The primary use case of this setup is to host a static website using the Astro framework, though this is applicable for any static site.

The infrastructure is deployed on Amazon Web Services (AWS) and utilizes various AWS components to ensure reliable and scalable hosting.

## AWS Components

- CloudFront Distribution: A CloudFront distribution is created to act as a content delivery network (CDN) for the static website/blog. It ensures faster content delivery and improved performance for end users.
- Private S3 Bucket: A private S3 bucket is used to store the static website/blog assets. The bucket is not publicly accessible and is only accessible through the CloudFront distribution.

## Additional Notes

- **AWS Terraform Provider:** The AWS Terraform provider is used to define and manage the AWS resources required for hosting the static website/blog.
- **SSL Certificate:** The SSL certificate required for HTTPS has been manually provisioned outside the Terraform code.
- **JavaScript Edge Function:** A small JavaScript edge function is implemented to support multi-page routing. This enables clean URLs and improved navigation within the static website/blog.
- **Terraform Cloud:** Terraform Cloud is utilized for storing the Terraform state and planning and executing the Terraform infrastructure deployment.

## Getting Started

To get started with this infrastructure, follow these steps:

1. Clone this repository to your local machine:

    ```sh
    git clone https://github.com/krishanthisera/blog-infra
    ```

2. Configure the Terraform backend to use Terraform Cloud or adjust it to match your preferred state storage method.
3. Customize the Terraform configuration files by updating the variables according to your specific requirements. Be sure to provide the necessary values bucket names, CloudFront settings, and other relevant parameters.
4. Make sure to setup  AWS access keys depending on deployment environment.
5. Run the following commands in the root directory of the repository to initialize and plan the Terraform configuration:

    ```sh
    terraform init
    terraform plan
    ```

6. Lastly, apply the Terraform configuration

    ```sh
    terraform apply
    ```

7. Once the Terraform apply process completes, your infrastructure will be deployed on AWS. You can access your static website or blog using the CloudFront URL provided.

## Deployer User

During the setup, an IAM user (`${var.domain_name}_deployer`) will be created with a set of relevant permissions. Once the deployment is completed, you may need to generate an access key pair for this user to integrate with your CI/CD Pipelines to generate access key pair.

## Further Reading

Please refer to the following URL for further reading:

- [Astro Framework](https://astro.build/)
- [Terraform by HashiCorp](https://www.terraform.io/)
- [AWS CloudFront](https://aws.amazon.com/cloudfront/)
- [AWS S3](https://aws.amazon.com/s3/)
- [Terraform Cloud](https://www.terraform.io/cloud)
