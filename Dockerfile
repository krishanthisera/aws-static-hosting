FROM public.ecr.aws/spacelift/runner-terraform:latest

USER root

# Install node and npm
RUN apk add --update --no-cache nodejs npm


USER spacelift

