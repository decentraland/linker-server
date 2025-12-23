#!/bin/bash

echo "Initializing LocalStack Secrets Manager..."

# Create the linker-server secret with a test private key
# Note: This is a test key for local development only - DO NOT use in production
awslocal secretsmanager create-secret \
    --name linker-server \
    --secret-string '{"private_key":"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"}' \
    --region us-east-1

echo "Secret 'linker-server' created successfully!"
echo "Listing secrets..."
awslocal secretsmanager list-secrets --region us-east-1

