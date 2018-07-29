"""
This script is called by the controller.service
"""
import json
import socket
import os
import pigpio
import RPi.GPIO as GPIO
import time

socket_path = '/tmp/uv4l.socket'

try:
    os.unlink(socket_path)
except OSError:
    if os.path.exists(socket_path):
        raise

s = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)


# print'socket_path: %s' % socket_path
s.bind(socket_path)
s.listen(1)


def cleanup():
    pass


class Wheels(object):
    INITIAL_FW_SPEED = 50  # starting speed when moving fw in %
    FW_ACCELERATION = 50  # acceleration when going fw, in % / second
    TOP_FW_SPEED = 100  # top speed in %
    FW_TURN_FACTOR = 2  # wheel in direction of turn is slowed by this factor (speed / factor)

    INITIAL_BW_SPEED = 20  # starting speed when moving bw in %
    BW_ACCELERATION = 50  # acceleration when going bw, in % / second
    TOP_BW_SPEED = 70  # top speed in %
    BW_TURN_FACTOR = 2  # wheel in direction of turn is slowed by this factor (speed / factor)

    INITIAL_TURN_SPEED = 10  # starting speed when turning in place in %
    TOP_TURN_SPEED = 60  # top speed in %
    TURN_BALANCE = 0.5  # balance of power to accomplish turn in place, must be between 0 and 1

    def __init__(
            self, r_wheel_forward=6, r_wheel_backward=13, l_wheel_forward=19, l_wheel_backward=26):
        self.r_wheel_forward = r_wheel_forward
        self.r_wheel_backward = r_wheel_backward
        self.l_wheel_forward = l_wheel_forward
        self.l_wheel_backward = l_wheel_backward

        # Setup motors
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(r_wheel_forward, GPIO.OUT)
        GPIO.setup(r_wheel_backward, GPIO.OUT)
        GPIO.setup(l_wheel_forward, GPIO.OUT)
        GPIO.setup(l_wheel_backward, GPIO.OUT)

        # setup pwm
        self.right_fw = GPIO.PWM(r_wheel_forward, self.FREQ)
        self.right_bw = GPIO.PWM(r_wheel_backward, self.FREQ)
        self.left_fw = GPIO.PWM(l_wheel_forward, self.FREQ)
        self.left_bw = GPIO.PWM(l_wheel_backward, self.FREQ)

        # Turn all motors off
        self.right_fw.start(0)
        self.right_bw.start(0)
        self.left_fw.start(0)
        self.left_bw.start(0)

        self._movement_timestamp = None

    def _spin_right_wheel_forward(self, speed):
        self.right_fw.ChangeDutyCycle(speed)
        self.right_bw.ChangeDutyCycle(0)

    def _spin_right_wheel_backward(self, speed):
        self.right_fw.ChangeDutyCycle(0)
        self.right_bw.ChangeDutyCycle(speed)

    def _stop_right_wheel(self):
        self.right_fw.ChangeDutyCycle(0)
        self.right_bw.ChangeDutyCycle(0)

    def _spin_left_wheel_forward(self, speed):
        self.left_fw.ChangeDutyCycle(speed)
        self.left_bw.ChangeDutyCycle(0)

    def _spin_left_wheel_backward(self, speed):
        self.left_fw.ChangeDutyCycle(0)
        self.left_bw.ChangeDutyCycle(speed)

    def _stop_left_wheel(self):
        self.left_fw.ChangeDutyCycle(0)
        self.left_bw.ChangeDutyCycle(0)

    def _get_fw_speed(self):
        # starting point
        speed = self.INITIAL_FW_SPEED

        # initialize the time if we haven't
        if self._movement_timestamp is None:
            self._movement_timestamp = time.time()
        else:
            # calculate the speed we should be using giving how long we have been accelerating
            speed += self.FW_ACCELERATION * (time.time() - self._movement_timestamp)

        # cap the speed
        return min(speed, self.TOP_FW_SPEED)

    def _get_bw_speed(self):
        speed = self.INITIAL_BW_SPEED

        if self._movement_timestamp is None:
            self._movement_timestamp = time.time()
        else:
            speed += self.BW_ACCELERATION * (time.time() - self._movement_timestamp)
        return min(speed, self.TOP_BW_SPEED)

    def _get_turn_speed(self):
        speed = self.INITIAL_TURN_SPEED

        if self._movement_timestamp is None:
            self._movement_timestamp = time.time()
        else:
            speed += self.TURN_ACCELERATION * (time.time() - self._movement_timestamp)

        # since we are spining one wheel fw and the other bw the total speed is the double
        total_speed = 2 * min(speed, self.TOP_TURN_SPEED)

        # balance that total speed between the wheels
        fw_speed = total_speed * (self.TURN_BALANCE)
        bw_speed = total_speed * (1 - self.TURN_BALANCE)

        # lower both speeds if we went over the limit to keep the diference
        adjust = max(0, self.TOP_TURN_SPEED - max(fw_speed, bw_speed))
        fw_speed -= adjust
        bw_speed -= adjust
        return fw_speed, bw_speed

    def go_fw(self):
        speed = self._get_fw_speed()
        self._spin_left_wheel_forward(speed)
        self._spin_right_wheel_forward(speed)

    def go_fw_left(self):
        speed = self._get_fw_speed()
        self._spin_left_wheel_forward(speed/self.FW_TURN_FACTOR)
        self._spin_right_wheel_forward(speed)

    def go_fw_right(self):
        speed = self._get_fw_speed()
        self._spin_left_wheel_forward(speed)
        self._spin_right_wheel_forward(speed/self.FW_TURN_FACTOR)

    def go_bw(self):
        speed = self._get_bw_speed()
        self._spin_left_wheel_backward(speed)
        self._spin_right_wheel_backward(speed)

    def go_bw_right(self):
        speed = self._get_bw_speed()
        self._spin_left_wheel_backward(speed)
        self._spin_right_wheel_backward(speed/self.BW_TURN_FACTOR)

    def go_bw_left(self):
        speed = self._get_bw_speed()
        self._spin_left_wheel_backward(speed/self.BW_TURN_FACTOR)
        self._spin_right_wheel_backward(speed)

    def stop(self):
        self._stop_left_wheel()
        self._stop_right_wheel()
        self._movement_timestamp = None

    def turn_right(self):
        fw_speed, bw_speed = self._get_turn_speed()
        self._spin_left_wheel_forward(fw_speed)
        self._spin_right_wheel_backward(bw_speed)

    def turn_left(self):
        fw_speed, bw_speed = self._get_turn_speed()
        self._spin_left_wheel_backward(bw_speed)
        self._spin_right_wheel_forward(fw_speed)


class Camera:
    CENTER = 40000
    UP_LIMIT = 80000
    DOWN_LIMIT = 30000
    STEP = 5000

    def __init__(self, servo=18, freq=50):
        self.servo = servo
        self.freq = freq
        self.pi = pigpio.pi()

        self.angle = self.CENTER
        self._set_angle()

    def _set_angle(self):
        self.pi.hardware_PWM(self.servo, self.freq, self.angle)

    def up(self):
        if self.angle + self.STEP < self.UP_LIMIT:
            self.angle += self.STEP
            self._set_angle()

    def down(self):
        if self.angle - self.STEP > self.DOWN_LIMIT:
            self.angle -= self.STEP
            self._set_angle()


MAX_MESSAGE_SIZE = 4096

if __name__ == "__main__":
    while True:
        print('awaiting connection...')
        connection, client_address = s.accept()
        print('client_address %s' % client_address)
        try:
            wheels = Wheels()
            camera = Camera()
            print('established connection with', client_address)

            while True:
                message = connection.recv(MAX_MESSAGE_SIZE)
                if not message:
                    break
                data = json.loads(message.decode('utf-8'))

                if 'commands' in data:
                    if 'FORDWARD' in data['commands']:
                        if 'RIGHT' in data['commands']:
                            wheels.go_fw_right()
                        elif 'LEFT' in data['commands']:
                            wheels.go_fw_left()
                        else:
                            wheels.go_fw()
                    elif 'BACKWARD' in data['commands']:
                        if 'RIGHT' in data['commands']:
                            wheels.go_bw_right()
                        elif 'LEFT' in data['commands']:
                            wheels.go_bw_left()
                        else:
                            wheels.go_bw()
                    else:
                        if 'RIGHT' in data['commands']:
                            wheels.turn_right()
                        elif 'LEFT' in data['commands']:
                            wheels.turn_left()
                        else:
                            wheels.stop()

                    if 'UP' in data['commands']:
                        camera.up()
                    elif 'DOWN' in data['commands']:
                        camera.down()

            print('connection closed')

        finally:
            # Clean up the connection
            wheels.stop()

            cleanup()
            connection.close()
