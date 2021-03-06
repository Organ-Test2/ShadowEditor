/*
 * Copyright 2003-2006, 2009, 2017, United States Government, as represented by the Administrator of the
 * National Aeronautics and Space Administration. All rights reserved.
 *
 * The NASAWorldWind/WebWorldWind platform is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @exports DrawContext
 */
import Color from '../util/Color';
import GpuResourceCache from '../cache/GpuResourceCache';
import Position from '../geom/Position';
import Rectangle from '../geom/Rectangle';
import SurfaceTileRenderer from '../render/SurfaceTileRenderer';
import WWMath from '../util/WWMath';

/**
 * Constructs a DrawContext. Applications do not call this constructor. A draw context is created by a
 * {@link WorldWindow} during its construction.
 * @alias DrawContext
 * @constructor
 * @classdesc Provides current state during rendering. The current draw context is passed to most rendering
 * methods in order to make those methods aware of current state.
 * @param {WebGLRenderingContext} gl The WebGL rendering context this draw context is associated with.
 */
function DrawContext(gl) {
    /**
     * The current WebGL rendering context.
     * @type {WebGLRenderingContext}
     */
    this.currentGlContext = gl;

    /**
     * A 2D canvas for creating texture maps.
     * @type {HTMLElement}
     */
    this.canvas2D = document.createElement("canvas");

    /**
     * A 2D context for this draw context's [canvas property]{@link DrawContext#canvas}.
     */
    this.ctx2D = this.canvas2D.getContext("2d");

    /**
     * The current clear color.
     * @type {Color}
     * @default Color.TRANSPARENT (red = 0, green = 0, blue = 0, alpha = 0)
     */
    this.clearColor = Color.TRANSPARENT;

    /**
     * The GPU resource cache, which tracks WebGL resources.
     * @type {GpuResourceCache}
     */
    this.gpuResourceCache = new GpuResourceCache(WorldWind.configuration.gpuCacheSize,
        0.8 * WorldWind.configuration.gpuCacheSize);

    /**
     * The surface-tile-renderer to use for drawing surface tiles.
     * @type {SurfaceTileRenderer}
     */
    this.surfaceTileRenderer = new SurfaceTileRenderer();

    /**
     * The current WebGL program. Null indicates that no WebGL program is active.
     * @type {GpuProgram}
     */
    this.currentProgram = null;

    /**
     * The list of surface renderables.
     * @type {Array}
     */
    this.surfaceRenderables = [];

    /**
     * Indicates whether this draw context is in ordered rendering mode.
     * @type {Boolean}
     */
    this.orderedRenderingMode = false;

    /**
     * The list of ordered renderables.
     * @type {Array}
     */
    this.orderedRenderables = [];

    // Provides ordinal IDs to ordered renderables.
    this.orderedRenderablesCounter = 0; // Number

    /**
     * The starting time of the current frame, in milliseconds. The frame timestamp is updated immediately
     * before the WorldWindow associated with this draw context is rendered, as a result of redrawing operation.
     * @type {Number}
     * @readonly
     */
    this.timestamp = Date.now();

    /**
     * The [time stamp]{@link DrawContext#timestamp} of the last visible frame, in milliseconds. This indicates
     * the time stamp that was current during the WorldWindow's last frame. 
     * The difference between the previous redraw time stamp and the current time stamp
     * indicates the duration between visible frames, e.g. <code style='white-space:nowrap'>timeStamp - previousRedrawTimestamp</code>.
     * @type {Number}
     * @readonly
     */
    this.previousRedrawTimestamp = this.timestamp;

    /**
     * Indicates whether a redraw has been requested during the current frame. When true, this causes the World
     * Window associated with this draw context to redraw after the current frame.
     * @type {Boolean}
     */
    this.redrawRequested = false;

    /**
     * The globe being rendered.
     * @type {Globe}
     */
    this.globe = null;

    /**
     * A copy of the current globe's state key. Provided here to avoid having to recompute it every time
     * it's needed.
     * @type {String}
     */
    this.globeStateKey = null;

    /**
     * The layers being rendered.
     * @type {Layer[]}
     */
    this.layers = null;

    /**
     * The layer being rendered.
     * @type {Layer}
     */
    this.currentLayer = null;

    /**
     * The current eye position.
     * @type {Position}
     */
    this.eyePosition = new Position(0, 0, 0);

    /**
     * The eye point in model coordinates, relative to the globe's center.
     * @type {THREE.Vector3}
     * @readonly
     */
    this.eyePoint = new THREE.Vector3();

    /**
     * The terrain for the current frame.
     * @type {Terrain}
     */
    this._terrain = null;
    Object.defineProperty(this, 'terrain', {
        get() {
            return this._terrain;
        },
        set(value) {
            this._terrain = value;
        }
    });

    /**
     * The number of milliseconds over which to fade shapes that support fading. Fading is most typically
     * used during decluttering.
     * @type {Number}
     * @default 500
     */
    this.fadeTime = 500;

    /**
     * The opacity to apply to terrain and surface shapes. Should be a number between 0 and 1.
     * @type {Number}
     * @default 1
     */
    this.surfaceOpacity = 1;

    this.pixelScale = 1;

    // TODO: replace with camera in the next phase of navigator refactoring
    this.navigator = null;

    this.modelview = new THREE.Matrix4();
    this.projection = new THREE.Matrix4();
    this.modelviewProjection = new THREE.Matrix4();

    /**
     * The viewing frustum in model coordinates. The frustum originates at the eyePoint and extends
     * outward along the forward vector. The near distance and far distance identify the minimum and
     * maximum distance, respectively, at which an object in the scene is visible.
     * @type {THREE.Frustum}
     * @readonly
     */
    this.frustumInModelCoordinates = new THREE.Frustum();

    /**
     * The matrix that transforms normal vectors in model coordinates to normal vectors in eye coordinates.
     * Typically used to transform a shape's normal vectors during lighting calculations.
     * @type {THREE.Matrix4}
     * @readonly
     */
    this.modelviewNormalTransform = new THREE.Matrix4();

    /**
     * The current viewport.
     * @type {Rectangle}
     * @readonly
     */
    this.viewport = new Rectangle(0, 0, 0, 0);

    this.pixelSizeFactor = 0;
    this.pixelSizeOffset = 0;

    this.glExtensionsCache = {};
}

DrawContext.unitCubeKey = "DrawContextUnitCubeKey";
DrawContext.unitCubeElementsKey = "DrawContextUnitCubeElementsKey";
DrawContext.unitQuadKey = "DrawContextUnitQuadKey";
DrawContext.unitQuadKey3 = "DrawContextUnitQuadKey3";

/**
 * Prepare this draw context for the drawing of a new frame.
 */
DrawContext.prototype.reset = function () {
    this.surfaceRenderables = []; // clears the surface renderables array
    this.orderedRenderingMode = false;
    this.orderedRenderables = []; // clears the ordered renderables array
    this.screenRenderables = [];
    this.orderedRenderablesCounter = 0;

    // Advance the per-frame timestamp.
    var previousTimestamp = this.timestamp;
    this.timestamp = Date.now();
    if (this.timestamp === previousTimestamp)
        ++this.timestamp;

    // Reset properties set by the WorldWindow every frame.
    this.redrawRequested = false;
    this.globe = null;
    this.globeStateKey = null;
    this.layers = null;
    this.currentLayer = null;
    this.terrain = null;
    this.accumulateOrderedRenderables = true;

    this.eyePoint.set(0, 0, 0);
    this.modelview.identity();
    this.projection.identity();
    this.modelviewProjection.identity();
    this.modelviewNormalTransform.identity();
};

/**
 * Computes any values necessary to render the upcoming frame. Called after all draw context state for the
 * frame has been set.
 */
DrawContext.prototype.update = function () {
    var gl = this.currentGlContext,
        eyePoint = this.eyePoint;

    this.globeStateKey = this.globe.stateKey;
    this.globe.computePositionFromPoint(eyePoint.x, eyePoint.y, eyePoint.z, this.eyePosition);
};

/**
 * Notifies this draw context that the current WebGL rendering context has been lost. This function removes all
 * cached WebGL resources and resets all properties tracking the current WebGL state.
 */
DrawContext.prototype.contextLost = function () {
    // Remove all cached WebGL resources, which are now invalid.
    this.gpuResourceCache.clear();
    // Reset properties tracking the current WebGL state, which are now invalid.
    this.currentFramebuffer = null;
    this.currentProgram = null;
    this.glExtensionsCache = {};
};

/**
 * Notifies this draw context that the current WebGL rendering context has been restored. This function prepares
 * this draw context to resume rendering.
 */
DrawContext.prototype.contextRestored = function () {
    // Remove all cached WebGL resources. This cache is already cleared when the context is lost, but
    // asynchronous load operations that complete between context lost and context restored populate the cache
    // with invalid entries.
    this.gpuResourceCache.clear();
    this.glExtensionsCache = {};
};

/**
 * Binds a specified WebGL program. This function also makes the program the current program.
 * @param {GpuProgram} program The program to bind. May be null or undefined, in which case the currently
 * bound program is unbound.
 */
DrawContext.prototype.bindProgram = function (program) {
    if (this.currentProgram != program) {
        this.currentGlContext.useProgram(program ? program.programId : null);
        this.currentProgram = program;
    }
};

/**
 * Binds a potentially cached WebGL program, creating and caching it if it isn't already cached.
 * This function also makes the program the current program.
 * @param {function} programConstructor The constructor to use to create the program.
 * @returns {GpuProgram} The bound program.
 */
DrawContext.prototype.findAndBindProgram = function (programConstructor) {
    var program = this.gpuResourceCache.resourceForKey(programConstructor.key);
    if (program) {
        this.bindProgram(program);
    } else {
        try {
            program = new programConstructor(this.currentGlContext);
            this.bindProgram(program);
            this.gpuResourceCache.putResource(programConstructor.key, program, program.size);
        } catch (e) {
            console.error("Error attempting to create GPU program.");
        }
    }

    return program;
};

/**
 * Indicates whether an extent is smaller than a specified number of pixels.
 * @param {THREE.Box3} extent The extent to test.
 * @param {Number} numPixels The number of pixels below which the extent is considered small.
 * @returns {Boolean} True if the extent is smaller than the specified number of pixels, otherwise false.
 * Returns false if the extent is null or undefined.
 */
DrawContext.prototype.isSmall = function (extent, numPixels) {
    if (!extent) {
        return false;
    }

    var distance = this.eyePoint.distanceTo(extent.center),
        pixelSize = this.pixelSizeAtDistance(distance);

    return 2 * extent.radius < numPixels * pixelSize; // extent diameter less than size of num pixels
};

/**
 * Returns the VBO ID of an array buffer containing a unit cube expressed as eight 3D vertices at (0, 1, 0),
 * (0, 0, 0), (1, 1, 0), (1, 0, 0), (0, 1, 1), (0, 0, 1), (1, 1, 1) and (1, 0, 1). The buffer is created on
 * first use and cached. Subsequent calls to this method return the cached buffer.
 * @returns {Object} The VBO ID identifying the array buffer.
 */
DrawContext.prototype.unitCubeBuffer = function () {
    var vboId = this.gpuResourceCache.resourceForKey(DrawContext.unitCubeKey);

    if (!vboId) {
        var gl = this.currentGlContext,
            points = new Float32Array(24),
            i = 0;

        points[i++] = 0; // upper left corner, z = 0
        points[i++] = 1;
        points[i++] = 0;
        points[i++] = 0; // lower left corner, z = 0
        points[i++] = 0;
        points[i++] = 0;
        points[i++] = 1; // upper right corner, z = 0
        points[i++] = 1;
        points[i++] = 0;
        points[i++] = 1; // lower right corner, z = 0
        points[i++] = 0;
        points[i++] = 0;

        points[i++] = 0; // upper left corner, z = 1
        points[i++] = 1;
        points[i++] = 1;
        points[i++] = 0; // lower left corner, z = 1
        points[i++] = 0;
        points[i++] = 1;
        points[i++] = 1; // upper right corner, z = 1
        points[i++] = 1;
        points[i++] = 1;
        points[i++] = 1; // lower right corner, z = 1
        points[i++] = 0;
        points[i] = 1;

        vboId = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vboId);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.gpuResourceCache.putResource(DrawContext.unitCubeKey, vboId, points.length * 4);
    }

    return vboId;
};

/**
 * Returns the VBO ID of a element array buffer containing the tessellation of a unit cube expressed as
 * a single buffer containing both triangle indices and line indices. This is intended for use in conjunction
 * with <code>unitCubeBuffer</code>. The unit cube's interior and outline may be rasterized as shown in the
 * following WebGL pseudocode:
 * <code><pre>
 * // Assumes that the VBO returned by unitCubeBuffer is used as the source of vertex positions.
 * bindBuffer(ELEMENT_ARRAY_BUFFER, drawContext.unitCubeElements());
 * drawElements(TRIANGLES, 36, UNSIGNED_SHORT, 0); // draw the unit cube interior
 * drawElements(LINES, 24, UNSIGNED_SHORT, 72); // draw the unit cube outline
 * </pre></code>
 * The buffer is created on first use
 * and cached. Subsequent calls to this method return the cached buffer.
 * @returns {Object} The VBO ID identifying the element array buffer.
 */
DrawContext.prototype.unitCubeElements = function () {
    var vboId = this.gpuResourceCache.resourceForKey(DrawContext.unitCubeElementsKey);

    if (!vboId) {
        var gl = this.currentGlContext,
            elems = new Int16Array(60),
            i = 0;

        // interior

        elems[i++] = 1; // -z face
        elems[i++] = 0;
        elems[i++] = 3;
        elems[i++] = 3;
        elems[i++] = 0;
        elems[i++] = 2;

        elems[i++] = 4; // +z face
        elems[i++] = 5;
        elems[i++] = 6;
        elems[i++] = 6;
        elems[i++] = 5;
        elems[i++] = 7;

        elems[i++] = 5; // -y face
        elems[i++] = 1;
        elems[i++] = 7;
        elems[i++] = 7;
        elems[i++] = 1;
        elems[i++] = 3;

        elems[i++] = 6; // +y face
        elems[i++] = 2;
        elems[i++] = 4;
        elems[i++] = 4;
        elems[i++] = 2;
        elems[i++] = 0;

        elems[i++] = 4; // -x face
        elems[i++] = 0;
        elems[i++] = 5;
        elems[i++] = 5;
        elems[i++] = 0;
        elems[i++] = 1;

        elems[i++] = 7; // +x face
        elems[i++] = 3;
        elems[i++] = 6;
        elems[i++] = 6;
        elems[i++] = 3;
        elems[i++] = 2;

        // outline

        elems[i++] = 0; // left, -z
        elems[i++] = 1;
        elems[i++] = 1; // bottom, -z
        elems[i++] = 3;
        elems[i++] = 3; // right, -z
        elems[i++] = 2;
        elems[i++] = 2; // top, -z
        elems[i++] = 0;

        elems[i++] = 4; // left, +z
        elems[i++] = 5;
        elems[i++] = 5; // bottom, +z
        elems[i++] = 7;
        elems[i++] = 7; // right, +z
        elems[i++] = 6;
        elems[i++] = 6; // top, +z
        elems[i++] = 4;

        elems[i++] = 0; // upper left
        elems[i++] = 4;
        elems[i++] = 5; // lower left
        elems[i++] = 1;
        elems[i++] = 2; // upper right
        elems[i++] = 6;
        elems[i++] = 7; // lower right
        elems[i] = 3;

        vboId = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vboId);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elems, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        this.gpuResourceCache.putResource(DrawContext.unitCubeElementsKey, vboId, elems.length * 2);
    }

    return vboId;
};

/**
 * Returns the VBO ID of a buffer containing a unit quadrilateral expressed as four 2D vertices at (0, 1),
 * (0, 0), (1, 1) and (1, 0). The four vertices are in the order required by a triangle strip. The buffer is
 * created on first use and cached. Subsequent calls to this method return the cached buffer.
 * @returns {Object} The VBO ID identifying the vertex buffer.
 */
DrawContext.prototype.unitQuadBuffer = function () {
    var vboId = this.gpuResourceCache.resourceForKey(DrawContext.unitQuadKey);

    if (!vboId) {
        var gl = this.currentGlContext,
            points = new Float32Array(8);

        points[0] = 0; // upper left corner
        points[1] = 1;
        points[2] = 0; // lower left corner
        points[3] = 0;
        points[4] = 1; // upper right corner
        points[5] = 1;
        points[6] = 1; // lower right corner
        points[7] = 0;

        vboId = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vboId);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.gpuResourceCache.putResource(DrawContext.unitQuadKey, vboId, points.length * 4);
    }

    return vboId;
};

/**
 * Returns the VBO ID of a buffer containing a unit quadrilateral expressed as four 3D vertices at (0, 1, 0),
 * (0, 0, 0), (1, 1, 0) and (1, 0, 0).
 * The four vertices are in the order required by a triangle strip. The buffer is created
 * on first use and cached. Subsequent calls to this method return the cached buffer.
 * @returns {Object} The VBO ID identifying the vertex buffer.
 */
DrawContext.prototype.unitQuadBuffer3 = function () {
    var vboId = this.gpuResourceCache.resourceForKey(DrawContext.unitQuadKey3);

    if (!vboId) {
        var gl = this.currentGlContext,
            points = new Float32Array(12);

        points[0] = 0; // upper left corner
        points[1] = 1;
        points[2] = 0;
        points[3] = 0; // lower left corner
        points[4] = 0;
        points[5] = 0;
        points[6] = 1; // upper right corner
        points[7] = 1;
        points[8] = 0;
        points[9] = 1; // lower right corner
        points[10] = 0;
        points[11] = 0;

        vboId = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vboId);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.gpuResourceCache.putResource(DrawContext.unitQuadKey3, vboId, points.length * 4);
    }

    return vboId;
};

/**
 * Computes a Cartesian point at a location on the surface of this terrain according to a specified
 * altitude mode. If there is no current terrain, this function approximates the returned point by assuming
 * the terrain is the globe's ellipsoid.
 * @param {Number} latitude The location's latitude.
 * @param {Number} longitude The location's longitude.
 * @param {Number} offset Distance above the terrain, in meters relative to the specified altitude mode, at
 * which to compute the point.
 * @param {String} altitudeMode The altitude mode to use to compute the point. Recognized values are
 * WorldWind.ABSOLUTE, WorldWind.CLAMP_TO_GROUND and
 * WorldWind.RELATIVE_TO_GROUND. The mode WorldWind.ABSOLUTE is used if the
 * specified mode is null, undefined or unrecognized, or if the specified location is outside this terrain.
 * @param {THREE.Vector3} result A pre-allocated THREE.Vector3 in which to return the computed point.
 * @returns {THREE.Vector3} The specified result parameter, set to the coordinates of the computed point.
 */
DrawContext.prototype.surfacePointForMode = function (latitude, longitude, offset, altitudeMode, result) {
    if (this.terrain) {
        this.terrain.surfacePointForMode(latitude, longitude, offset, altitudeMode, result);
    } else {
        var h = offset + this.globe.elevationAtLocation(latitude, longitude);
        this.globe.computePointFromPosition(latitude, longitude, h, result);
    }

    return result;
};

/**
 * Transforms the specified model point from model coordinates to WebGL screen coordinates.
 * <p>
 * The resultant screen point is in WebGL screen coordinates, with the origin in the bottom-left corner and
 * axes that extend up and to the right from the origin.
 * <p>
 * This function stores the transformed point in the result argument, and returns true or false to indicate
 * whether or not the transformation is successful. It returns false if the modelview or
 * projection matrices are malformed, or if the specified model point is clipped by the near clipping plane or
 * the far clipping plane.
 *
 * @param {THREE.Vector3} modelPoint The model coordinate point to project.
 * @param {THREE.Vector3} result A pre-allocated vector in which to return the projected point.
 * @returns {boolean} true if the transformation is successful, otherwise false.
 */
DrawContext.prototype.project = function (modelPoint, result) {
    // Transform the model point from model coordinates to eye coordinates then to clip coordinates. This
    // inverts the Z axis and stores the negative of the eye coordinate Z value in the W coordinate.
    var mx = modelPoint.x,
        my = modelPoint.y,
        mz = modelPoint.z,
        m = this.modelviewProjection,
        x = m[0] * mx + m[1] * my + m[2] * mz + m[3],
        y = m[4] * mx + m[5] * my + m[6] * mz + m[7],
        z = m[8] * mx + m[9] * my + m[10] * mz + m[11],
        w = m[12] * mx + m[13] * my + m[14] * mz + m[15];

    if (w === 0) {
        return false;
    }

    // Complete the conversion from model coordinates to clip coordinates by dividing by W. The resultant X, Y
    // and Z coordinates are in the range [-1,1].
    x /= w;
    y /= w;
    z /= w;

    // Clip the point against the near and far clip planes.
    if (z < -1 || z > 1) {
        return false;
    }

    // Convert the point from clip coordinate to the range [0,1]. This enables the X and Y coordinates to be
    // converted to screen coordinates, and the Z coordinate to represent a depth value in the range[0,1].
    x = x * 0.5 + 0.5;
    y = y * 0.5 + 0.5;
    z = z * 0.5 + 0.5;

    // Convert the X and Y coordinates from the range [0,1] to screen coordinates.
    x = x * this.viewport.width + this.viewport.x;
    y = y * this.viewport.height + this.viewport.y;

    result.x = x;
    result.y = y;
    result.z = z;

    return true;
};

/**
 * Computes the approximate size of a pixel at a specified distance from the eye point.
 * <p>
 * This method assumes rectangular pixels, where pixel coordinates denote
 * infinitely thin spaces between pixels. The units of the returned size are in model coordinates per pixel
 * (usually meters per pixel). This returns 0 if the specified distance is zero. The returned size is undefined
 * if the distance is less than zero.
 *
 * @param {Number} distance The distance from the eye point at which to determine pixel size, in model
 * coordinates.
 * @returns {Number} The approximate pixel size at the specified distance from the eye point, in model
 * coordinates per pixel.
 */
DrawContext.prototype.pixelSizeAtDistance = function (distance) {
    // Compute the pixel size from the width of a rectangle carved out of the frustum in model coordinates at
    // the specified distance along the -Z axis and the viewport width in screen coordinates. The pixel size is
    // expressed in model coordinates per screen coordinate (e.g. meters per pixel).
    //
    // The frustum width is determined by noticing that the frustum size is a linear function of distance from
    // the eye point. The linear equation constants are determined during initialization, then solved for
    // distance here.
    //
    // This considers only the frustum width by assuming that the frustum and viewport share the same aspect
    // ratio, so that using either the frustum width or height results in the same pixel size.

    return this.pixelSizeFactor * distance + this.pixelSizeOffset;
};

/**
 * Returns a WebGL extension and caches the result for subsequent calls.
 *
 * @param {String} extensionName The name of the WebGL extension.
 * @returns {Object|null} A WebGL extension object, or null if the extension is not available.
 */
DrawContext.prototype.getExtension = function (extensionName) {
    if (!(extensionName in this.glExtensionsCache)) {
        this.glExtensionsCache[extensionName] = this.currentGlContext.getExtension(extensionName) || null;
    }

    return this.glExtensionsCache[extensionName];
};

export default DrawContext;
