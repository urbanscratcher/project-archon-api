docker stop api-archon
docker remove api-archon
docker rmi api-archon
docker build . --tag api-archon
docker run -d --name api-archon -p 5001:5001 api-archon