@echo off
echo Building STL Price Estimator Docker image...

REM Build the Docker image
docker build -t stl-price-estimator .

echo Build complete!
echo.
echo To run the container:
echo docker run -p 3000:3000 -v %cd%/uploads:/app/uploads stl-price-estimator
echo.
echo Or use docker-compose:
echo docker-compose up -d
echo.
echo The application will be available at http://localhost:3000
