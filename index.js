const cv = require('opencv4nodejs');

const devicePort = 0;
const wCap = new cv.VideoCapture(devicePort);

console.log(wCap);

// segmenting by skin color (has to be adjusted)
const skinColorUpper = hue => new cv.Vec(hue/2, 1 * 255, 1 * 255);
const skinColorLower = hue => new cv.Vec(hue/2, 0.8 * 255, 0.4 * 255);
// const skinColorUpper = hue => new cv.Vec(hue, 0.8 * 255, 0.6 * 255);
// const skinColorLower = hue => new cv.Vec(hue, 0.1 * 255, 0.05 * 255);

var counter = 0;

const trackBall = (oldFrame, modifyInput = false, locationFrame = null) => {

  const img = oldFrame.copy();
  // filter by skin color
  const imgHLS = img.cvtColor(cv.COLOR_RGB2HSV);
  
  // if (counter > 350*2) {
  //   counter = 0;
  // }
  // startHue = Math.round(counter/2);
  // console.log('startHue:', startHue);
  // const rangeMask = imgHLS.inRange(skinColorLower(startHue), skinColorUpper(startHue+10));
  // counter++;
  const rangeMask = imgHLS.inRange(skinColorLower(220), skinColorUpper(250));
  // const rangeMask = imgHLS.inRange(skinColorLower(250), skinColorUpper(360));
  // const rangeMask = imgHLS.inRange(skinColorUpper(0), skinColorLower(30));

  // remove noise
  const blurred = rangeMask.blur(new cv.Size(10, 10));
  // const thresholded = rangeMask.threshold(
  //   220,
  //   255,
  //   cv.THRESH_BINARY
  // );


  const contours = blurred.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  // console.log('contours:', contours);
  if (contours.length > 0) {
    let largestContour = contours.reduce((largest, current) => {
      return largest.area < current.area ? current : largest;
    }, {area: 0})
    // let largestContour = contours[0];
    if (largestContour != null) {

      let x, y = 0;
      let boundingRect = largestContour.boundingRect();
      // console.log('largestContour:', largestContour);
      // console.log('largestContour.boundingRect():', largestContour.boundingRect());
      x = boundingRect.x + Math.round(boundingRect.width/2);
      y = boundingRect.y + Math.round(boundingRect.height/2);
      console.log('x: '+ x + ', y: ' +  y);
      if (!modifyInput) {
        blurred.set(y, x, [255]);
        // console.log('blurred:', blurred);
        let bounded = blurred.drawRectangle(largestContour.boundingRect(), new cv.Vec(110, 255, 255), 5);
      } else {
        if (locationFrame != null) {
          locationFrame.set(y, x, [0, 255, 0]);
        } else {
          oldFrame.set(y, x, [255]);
        }
        // modifies the actual input
        oldFrame.drawRectangle(boundingRect, new cv.Vec(0, 255, 0), 5);
      }
      
    }
  } else {
    return blurred;
  }

  return blurred;
};

function modifyFrame(oldFrame) {

  const frame = oldFrame.copy();
  //  frame = frame.cvtColor(cv.COLOR_BGR2HLS);

  const probeLocation = [200, 300]
  const probeSize = 10;
  
  let regionArr = frame.getRegion(new cv.Rect(probeLocation[0], probeLocation[1], probeSize, probeSize)).getDataAsArray();
  for (let i in regionArr) {
    for (let j in regionArr) {
      // console.log('i:', i);
      // console.log('j:', j);
      // console.log('probeLocation[0]+(25-i):', probeLocation[0]+(Math.round(25/2-i)));
      frame.set(probeLocation[0]+(Math.round(probeSize/2-i)), probeLocation[1]+(Math.round(probeSize/2-j)), [0, 0, 255]);
    }
  }
  frame.set(probeLocation[0], probeLocation[1], [0, 255, 0]);
  
  return frame.mul(1);
  
}

// loop through the capture
const delay = 10;
let done = false;
while (!done) {
  let frame = wCap.read();
  // loop back to start on end of stream reached
  if (frame.empty) {
    wCap.reset();
    frame = wCap.read();
  }

  // console.log('frame: ', frame);
  let location = new cv.Mat(frame.rows, frame.cols, cv.CV_8UC3, [0, 0, 0]);
  let masked = trackBall(frame, true, location);
  cv.imshow('frame', frame);
  // cv.imshow('masked', masked);
  // cv.imshow('location', location);
  // cv.imshow('modified', modified);
  // cv.waitKey();

  const key = cv.waitKey(delay);
  // done = key !== 255;
}