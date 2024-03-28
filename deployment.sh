#!/bin/sh
cd ../iddyx-backend
git pull origin master
sudo service nginx restart
pm2 stop index.js
pm2 start index.js

