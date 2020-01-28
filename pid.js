module.exports = class PID {

  constructor(frameWidth, frameHeight, targetX, targetY, offsetX, offsetY) {

    this.ballX = 0;
    this.ballY = 0;
    this.servoX = 0;
    this.servoY = 0;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.targetX = targetX;
    this.targetY = targetY;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // this.CHANNEL = {
    //   X: 0,
    //   Y: 1,
    // }

  }

  submitBallPosition(x, y) {

    this.ballX = x;
    this.ballY = y;

    this.calculateServoPositions();

  }

  calculateProportional(current, target, min, max) {

    // let scalar = Math.pow(Math.abs(current-target), -1);
    let scalar = current < target ? (target-current)/(target-min) : (current-target)/(max-target);
    scalar *= .4;
    scalar = Math.pow(scalar, 2);

    // let servoTimingOffset = Math.round((current - target) * scalar);
    // console.log(`current:${current}, target:${target}, scalar:${scalar}
    // setting to ${servoTimingOffset}
    // `);
    
    return current < target ? -scalar : scalar;
    
  }

  calculateServoPositions() {

    // this.servoX = (1500 + this.offsetX) + (this.calculateProportional(this.ballX, this.targetX, 0, this.frameHeight) / 4.0);
    // this.servoY = (1500 + this.offsetY) + this.calculateProportional(this.ballY, this.targetY, 0, this.frameWidth);
    this.servoX = Math.round((1500 + this.offsetX) + (150 * this.calculateProportional(this.ballX, this.targetX, 0, this.frameHeight) / 4.0));
    this.servoY = Math.round((1500 + this.offsetY) + 150 * this.calculateProportional(this.ballY, this.targetY, 0, this.frameWidth));

  }

  retrieveServoPositions() {

    return {
      servoX: this.servoX,
      servoY: this.servoY,
    }

  }

  /**
   * @param {number} x
   */
  set setOffsetX(x) {
    this.offsetX = x;
  }

  /**
   * @param {number} y
   */
  set setOffsetY(y) {
    this.offsetY = y;
  }

  getBaseLog(base, value) {
    return Math.log(value) / Math.log(base);
  }

}