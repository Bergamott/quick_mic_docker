# quick_mic_docker
Docker files and data for setting up a Node.js application that communicates with a MySQL database.

To build Docker images, run inside of Node_js folder:

	docker build . -t node

Run inside of Mysql folder:

	docker build . -t mysql

Then start both containers from this directory with:

	docker-compose up

The application is accessible from localhost:8080
