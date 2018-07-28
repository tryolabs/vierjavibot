# basic
sudo apt-get update
sudo apt-get install -y vim git python3-pip

# uv4l installation
curl http://www.linux-projects.org/listing/uv4l_repo/lpkey.asc | sudo apt-key add -
echo "deb http://www.linux-projects.org/listing/uv4l_repo/raspbian/stretch stretch main" >>/etc/apt/sources.list
sudo apt-get install -y uv4l uv4l-raspicam uv4l-raspicam-extras uv4l-dummy

# isntall rpi.gpio
sudo apt-get install rpi.gpio

pip3 install -r requirements.txt

mv /etc/uv4l/uv4l-raspicam.conf /etc/uv4l/uv4l-raspicam.conf.bak
mv uv4l-raspicam.conf /etc/uv4l/uv4l-raspicam.conf
