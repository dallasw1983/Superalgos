﻿

/*

Whithin this sub-system, the canvas object represents a layer on top of the browser canvas object.

Graphically, this sub-system has 3 spaces:

1) The "Chart Space": It is where the charts are plotted.

2) The "Floating Space": It is where floating elements live. There is a physics engine for this layer that allows these elements to flow.  

3) The "Panels Space": It is where panels live. --> This space has yet to be develop, currently pannels are somehow at the Chart Space.  

All these spaces are child objects of the Canvas object.

Canvas
  |
  |
  ---> chartSpace
  |
  |
  ---> flaotingSpace
  |
  |
  ---> panelsSpace

*/

let browserCanvas;                 // This is the canvas object of the browser.
let browserCanvasContext;          // The context of the canvas object.

let stepsInitializationCounter = 0;         // This counter the initialization steps required to be able to turn off the splash screen.
let marketInitializationCounter = 0;        // This counter the initialization of markets required to be able to turn off the splash screen.
let splashScreenNeeded = true;

function newCanvas() {

    const MODULE_NAME = "Canvas";
    const INFO_LOG = false;
    const ERROR_LOG = true;
    const logger = newDebugLog();
    logger.fileName = MODULE_NAME;

    /* Mouse event related variables. */

    let containerDragStarted = false;
    let ballDragStarted = false;
    let ballBeingDragged;
    let containerBeingDragged;
    let viewPortBeingDragged = false;

    let dragVector = {
        downX: 0,
        downY: 0,
        upX: 0,
        upY: 0
    };

    /* canvas object */

    let thisObject = {
        eventHandler: undefined,
        chartSpace: undefined,
        floatingSpace: undefined,
        panelsSpace: undefined,
        animation: undefined,
        initialize: initialize
    };

    thisObject.eventHandler = newEventHandler();

    let splashScreen;

    return thisObject;

    function initialize(callBackFunction) {

        if (INFO_LOG === true) { logger.write("[INFO] initialize -> Entering function."); }

        initializeBrowserCanvas();

        addCanvasEvents();

        /* Instantiate all the children of Canvas object */ 

        let panelsSpace = newPanelsSpace();
        panelsSpace.initialize();

        this.panelsSpace = panelsSpace;

        let floatingSpace = newFloatingSpace();
        floatingSpace.initialize();

        this.floatingSpace = floatingSpace;

        let chartSpace = newChartSpace();
        chartSpace.initialize();

        this.chartSpace = chartSpace;

        /* Splash Screen */

        splashScreen = newSplashScreen();
        splashScreen.initialize();

        let animation = newAnimation();
        animation.initialize(onAnimationInitialized);

        function onAnimationInitialized(err) {

            this.animation = animation;

            /* Here we add all the functions that will be called during the animation cycle. */

            animation.addCallBackFunction("Chart Space", thisObject.chartSpace.draw, onFunctionAdded);
            animation.addCallBackFunction("Floating Space", thisObject.floatingSpace.physicsLoop, onFunctionAdded);
            animation.addCallBackFunction("Panels Space", thisObject.panelsSpace.draw, onFunctionAdded);
            animation.addCallBackFunction("Splash Screen", splashScreen.draw, onFunctionAdded);
            animation.addCallBackFunction("ViewPort Animate", viewPort.animate, onFunctionAdded);
            animation.addCallBackFunction("ViewPort Draw", viewPort.draw, onFunctionAdded);
            animation.start(onStart);

            function onFunctionAdded(err) {

                if (err.result === GLOBAL.CUSTOM_FAIL_RESPONSE.result) {

                    animation.stop();

                    if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> onAnimationInitialized -> onFunctionAdded -> Animation Stopped since a vital funtion could not be added."); }

                    /* Display some Error Page here. */
                }
            }

            function onStart(err) {

                switch (err.result) {
                    case GLOBAL.DEFAULT_OK_RESPONSE.result: {

                        if (INFO_LOG === true) { logger.write("[INFO] initialize -> onAnimationInitialized -> onStart ->  Received OK Response."); }
                        callBackFunction(GLOBAL.DEFAULT_OK_RESPONSE);
                        return;
                    }

                    case GLOBAL.DEFAULT_FAIL_RESPONSE.result: {

                        if (INFO_LOG === true) { logger.write("[INFO] initialize -> onAnimationInitialized -> onStart -> Received FAIL Response."); }
                        callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);
                        return;
                    }

                    default: {

                        if (INFO_LOG === true) { logger.write("[INFO] initialize -> onAnimationInitialized -> onStart -> Received Unexpected Response."); }
                        callBackFunction(err);
                        return;
                    }
                }
            }
        }
    }

    function initializeBrowserCanvas() {

        if (INFO_LOG === true) { logger.write("[INFO] initializeBrowserCanvas -> Entering function."); }

        browserCanvas = document.getElementById('canvas');
        browserCanvasContext = browserCanvas.getContext('2d');

        let body = document.getElementById('body');

        browserCanvas.width = window.innerWidth;
        browserCanvas.height = window.innerHeight;
        browserCanvas.style.border = "none";

        viewPort.initialize();
    }

    function addCanvasEvents() {

        if (INFO_LOG === true) { logger.write("[INFO] addCanvasEvents -> Entering function."); }

        /* Mouse down and up events to control the drag of the canvas. */

        browserCanvas.addEventListener('mousedown', onMouseDown, false);
        browserCanvas.addEventListener('mouseup', onMouseUp, false);
        browserCanvas.addEventListener('mousemove', onMouseMove, false);
        browserCanvas.addEventListener('click', onMouseClick, false);

        /* Mouse wheel events. */

        if (browserCanvas.addEventListener) {
            // IE9, Chrome, Safari, Opera
            browserCanvas.addEventListener("mousewheel", onMouseWheel, false);
            // Firefox
            browserCanvas.addEventListener("DOMMouseScroll", onMouseWheel, false);
        }
        // IE 6/7/8
        else browserCanvas.attachEvent("onmousewheel", onMouseWheel);

    }

    function onMouseDown(event) {

        if (INFO_LOG === true) { logger.write("[INFO] onMouseDown -> Entering function."); }

        /*

        There are four types of elements that can be dragged.

        1. Panels.
        2. Floating Elements (Currently only Balls).
        3. Charts.
        4. The Viewport.

        We eveluate each space in order to see if they are holding the element being dragged, and we fallout at the Viewport.

        */

        dragVector.downX = event.pageX;
        dragVector.downY = event.pageY;

        let point = {
            x: event.pageX,
            y: event.pageY
        };

        let container;

        /* We check first if the mouse is over a panel/ */

        container = thisObject.panelsSpace.getContainer(point);

        if (container !== undefined && container.isDraggeable === true) {

            containerBeingDragged = container;
            containerDragStarted = true;
            return;
        }

        /* We check first if the mouse is over a ball/ */

        ballBeingDragged = thisObject.floatingSpace.isInside(event.pageX, event.pageY);

        if (ballBeingDragged >= 0) {
            ballDragStarted = true;
            return;
        } 

        /* If it is not, then we check if it is over any of the existing containers at the Chart Space. */

        container = thisObject.chartSpace.getContainer(point);

        if (container !== undefined && container.isDraggeable === true) {

            containerBeingDragged = container;
            containerDragStarted = true;
            return;
        } 

        viewPortBeingDragged = true;
    }

    function onMouseClick(event) {

        if (INFO_LOG === true) { logger.write("[INFO] onMouseClick -> Entering function."); }

        let point = {
            x: event.pageX,
            y: event.pageY
        };

        let container;

        /* We check first if the mouse is over a panel/ */

        container = thisObject.panelsSpace.getContainer(point);

        if (container !== undefined && container.isClickeable === true) {

            container.eventHandler.raiseEvent('onMouseClick', event);
            return;
        }

        /* We check first if the mouse is over a ball/ */

        let ballBeingClicked = thisObject.floatingSpace.isInside(event.pageX, event.pageY);

        if (ballBeingClicked >= 0) {

            /* Right now we do nothing with this. */
            return;

        } 

        /* If it is not, then we check if it is over any of the existing containers at the Chart Space. */

        container = thisObject.chartSpace.getContainer(point);

        if (container !== undefined && container.isClickeable === true) {

            container.eventHandler.raiseEvent('onMouseClick', event);
            return;
        } 
    }

    function onMouseUp(event) {

        if (INFO_LOG === true) { logger.write("[INFO] onMouseUp -> Entering function."); }

        if (containerDragStarted || viewPortBeingDragged || ballDragStarted) {

            thisObject.eventHandler.raiseEvent("Drag Finished", undefined);

        }

        /* Turn off all the possible things that can be dragged. */

        containerDragStarted = false;
        ballDragStarted = false;
        viewPortBeingDragged = false;

        containerBeingDragged = undefined;

        browserCanvas.style.cursor = "auto";

    }

    function onMouseMove(event) {

        if (INFO_LOG === true) { logger.write("[INFO] onMouseMove -> Entering function."); }

        viewPort.mousePosition.x = event.pageX;
        viewPort.mousePosition.y = event.pageY;

        if (containerDragStarted === true || ballDragStarted === true || viewPortBeingDragged === true) {

            if (ballDragStarted === true) {

                if (thisObject.floatingSpace.isInsideBall(ballBeingDragged, event.pageX, event.pageY) === false) {

                    /* This means that the user stop moving the mouse and the ball ball out of the pointer.
                    In this case we cancell the drag operation . */

                    ballDragStarted = false;
                    browserCanvas.style.cursor = "auto";
                    return;
                }

            }

            dragVector.upX = event.pageX;
            dragVector.upY = event.pageY;

            checkDrag();
        }
    }

    function onMouseWheel(event) {

        if (INFO_LOG === true) { logger.write("[INFO] onMouseWheel -> Entering function."); }

        // cross-browser wheel delta 
        var event = window.event || event; // old IE support
        let delta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail));

        let ballIndex = thisObject.floatingSpace.isInside(event.pageX, event.pageY);

        if (ballIndex >= 0) {

            /* We need to apply the Radius zoom to the cointainer of the ball where the zoom was made, for that reason, we need the ball. */

           // balls[ballIndex].container.zoom.rZoom(delta);   // Zoom is applied to ball radius.

        } else {

            /* We check if the mouse is over any of the existing containers. */

            let point = {
                x: event.pageX,
                y: event.pageY
            };

            /*
            var container = canvas.chartSpace.getContainer(point);

            if (container !== undefined && container.isZoomeable === true) {

                if (container.zoom.xyZoom(delta) === true) {

                    updateBallsTargets();

                }

            } */

            viewPort.applyZoom(delta);
        }

        return false;  // This instructs the browser not to take the event and scroll the page. 
    }

    function checkDrag() {

        if (INFO_LOG === true) { logger.write("[INFO] checkDrag -> Entering function."); }

        if (containerDragStarted === true || ballDragStarted === true || viewPortBeingDragged === true) {

            browserCanvas.style.cursor = "grabbing";
            thisObject.eventHandler.raiseEvent("Dragging", undefined);

            let targetBall = thisObject.floatingSpace.isInside(event.pageX, event.pageY);

            if (ballDragStarted) {

                let ball = thisObject.floatingSpace.balls[ballBeingDragged];

                ball.currentPosition.x = dragVector.upX;
                ball.currentPosition.y = dragVector.upY;

                /* Now we estimate if the drag was towards the Target Point of the ball or not. */

                let distDown = distance(dragVector.downX, dragVector.downY, ball.targetPosition.x, ball.targetPosition.y);
                let distUp = distance(dragVector.upX, dragVector.upY, ball.targetPosition.x, ball.targetPosition.y);

                let mZoomValue;

                if (distDown < distUp) {

                    mZoomValue = 1;
                } else {
                    mZoomValue = -1;
                }

                //ball.container.zoom.mZoom(mZoomValue);   // Zoom is applied to ball mass of all balls in the same container.
            }

            if (containerDragStarted || viewPortBeingDragged) {

                /* The parameters received have been captured with zoom applied. We must remove the zoom in order to correctly modify the displacement. */


                let downCopy = {
                    x: dragVector.downX,
                    y: dragVector.downY
                };

                let downCopyNoTransf;
                downCopyNoTransf = viewPort.unzoomThisPoint(downCopy);
                //downCopyNoTransf = containerBeingDragged.zoom.unzoomThisPoint(downCopyNoTransf);

                let upCopy = {
                    x: dragVector.upX,
                    y: dragVector.upY
                };

                let upCopyNoTranf;
                upCopyNoTranf = viewPort.unzoomThisPoint(upCopy);
                //upCopyNoTranf = containerBeingDragged.zoom.unzoomThisPoint(upCopyNoTranf);

                /*
                let displaceVector = {
                    x: upCopyNoTranf.x - downCopyNoTransf.x,
                    y: upCopyNoTranf.y - downCopyNoTransf.y
                };
                */

                let displaceVector = {
                    x: dragVector.upX - dragVector.downX,
                    y: dragVector.upY - dragVector.downY
                };


                if (viewPortBeingDragged) {

                    viewPort.displace(displaceVector);

                }


                if (containerBeingDragged !== undefined) {

                    containerBeingDragged.frame.position.x = containerBeingDragged.frame.position.x + displaceVector.x;
                    containerBeingDragged.frame.position.y = containerBeingDragged.frame.position.y + displaceVector.y;

                }





                /*
                if (containerBeingDragged.displacement.displace(diffX, diffY) === true) {

                    updateBallsTargets();  // TODO: this should not be here

                } else
                {
                    // If the displacement can not be performed, then we dont abort the dragging operation, just allow the user to move the mouse in some other direction.
                }
                */



            }

            /* Finally we set the starting point of the new dragVector at this current point. */

            dragVector.downX = dragVector.upX;
            dragVector.downY = dragVector.upY;

        }

    }

}


