#!/bin/bash


echo "Giving permissions"
chmod 775 -R .
echo "Permissions granted"

echo "Installing missing modules"
npm i
echo "Missing modules installed."


echo "Restarting servers "
sudo pm2 restart 0 || exit
echo "Servers restarted "



echo "Deployed"