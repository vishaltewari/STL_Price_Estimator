# STL Price Estimator - Docker Deployment

This guide explains how to deploy the STL Price Estimator using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, but recommended)

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. Clone/download the project
2. Navigate to the project directory
3. Run:
   ```bash
   docker-compose up -d
   ```
4. Open http://localhost:3000 in your browser

### Option 2: Using Docker directly

1. Build the image:
   ```bash
   docker build -t stl-price-estimator .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 -v $(pwd)/uploads:/app/uploads stl-price-estimator
   ```

### Option 3: Using the deployment scripts

#### On Linux/macOS:
```bash
chmod +x deploy.sh
./deploy.sh
```

#### On Windows:
```cmd
deploy.bat
```

## Environment Variables

You can customize the deployment using environment variables:

- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Change the port (default: 3000)

Example:
```bash
docker run -p 8080:8080 -e PORT=8080 -e NODE_ENV=production stl-price-estimator
```

## Deployment Platforms

This Docker setup can be deployed to various platforms:

### AWS ECS
1. Push the image to Amazon ECR
2. Create an ECS task definition
3. Deploy to ECS Fargate or EC2

### Google Cloud Run
1. Push the image to Google Container Registry
2. Deploy to Cloud Run

### DigitalOcean App Platform
1. Connect your repository
2. Set the Dockerfile path
3. Deploy

### Heroku
1. Install Heroku CLI
2. Login and create app:
   ```bash
   heroku create your-app-name
   heroku container:push web
   heroku container:release web
   ```

### Railway
1. Connect your GitHub repository
2. Railway will automatically detect the Dockerfile
3. Deploy

## Resource Requirements

- **Memory**: Minimum 512MB, recommended 2GB for large STL files
- **CPU**: 1 vCPU recommended
- **Storage**: Depends on upload volume, 10GB recommended

## Troubleshooting

### Container won't start
- Check Docker logs: `docker logs <container-id>`
- Ensure all required ports are available
- Verify Docker has sufficient memory allocated

### PrusaSlicer errors
- The container includes a virtual display for PrusaSlicer
- Large STL files may require more memory
- Check upload file size limits

### Upload issues
- Ensure the uploads volume is properly mounted
- Check file permissions
- Verify disk space

## Monitoring

To monitor the running container:

```bash
# View logs
docker-compose logs -f

# Check resource usage
docker stats

# Access container shell
docker-compose exec stl-price-estimator bash
```

## Scaling

For high-traffic deployments:

1. Use a load balancer
2. Deploy multiple instances
3. Consider using a shared volume for uploads
4. Implement a job queue for processing large files

## Security Considerations

- The container runs PrusaSlicer with elevated privileges for GUI emulation
- File uploads are stored locally - consider using cloud storage for production
- Implement rate limiting for uploads
- Use HTTPS in production
- Consider implementing user authentication

## Support

If you encounter issues:
1. Check the Docker logs
2. Verify your Docker and Docker Compose versions
3. Ensure sufficient system resources
4. Review the GitHub issues page
