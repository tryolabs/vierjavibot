const color = 'aqua';
const lineWidth = 2;

function toTuple({ y, x }) {
  return [y, x];
}

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  adjacentKeyPoints.forEach(keypoints => {
    drawSegment(toTuple(keypoints[0].position), toTuple(keypoints[1].position), color, scale, ctx);
  });
}

/**
 * Used by the drawHeatMapValues method to draw heatmap points on to
 * the canvas
 */
function drawPoints(ctx, points, radius, color) {
  const data = points.buffer().values;

  for (let i = 0; i < data.length; i += 2) {
    const pointY = data[i];
    const pointX = data[i + 1];

    if (pointX !== 0 && pointY !== 0) {
      ctx.beginPath();
      ctx.arc(pointX, pointY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}

function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw pose keypoints onto a canvas
 */
function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const { y, x } = keypoint.position;
    drawPoint(ctx, y * scale, x * scale, 3, color);
  }
}

async function loadNet() {
    return await posenet.load();
}

async function detectBody(canvas, net) {
    if (net){
        var ctx = canvas.getContext('2d');
        var imageElement = ctx.getImageData(0, 0, canvas.width, canvas.height);

        var imageScaleFactor = 0.3;
        var flipHorizontal = false;
        var outputStride = 16;
        var maxPoseDetections = 2;
        var poses = await net.estimateMultiplePoses(
            imageElement,
            imageScaleFactor,
            flipHorizontal,
            outputStride,
            maxPoseDetections
        )
        return poses;
    } else {
        return net;
    }

}
