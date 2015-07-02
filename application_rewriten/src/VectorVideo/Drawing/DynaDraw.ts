/// <reference path="Path" />
/// <reference path="../Helpers/VideoTimer" />

module Drawing {
	
	import Vector2 = Helpers.Vector2;
	import VideoTimer = Helpers.VideoTimer;
    import CursorState = Helpers.CursorState;
	
	import VideoEvents = Helpers.VideoEvents;
	import VideoEventType = Helpers.VideoEventType;
		
	/**
	 * This class is an implementation of the algorithm originally created
	 * in 1989 by Paul Haeberli - see http://www.sgi.com/grafica/dyna/index.html
	 * The algorithm is based on physical properties of an object which is guided
	 * by mouse movement.
	 */	
	export class DynaDraw {
				
		/** The cursor */
		private cursor: BrushTip;
		
		/** Next cursor position */
		private position: Vector2;
		
		/** Next cursor pressure */
		private pressure: number;
		
        /** Currently drawn path */
        protected path: Path;
		
		/** Physical constants */
		private minMass: number = 1;
		private maxMass: number = 10;
		private minFriction: number = 0.4; // 0.4 is experimentaly derived constant, that gives nice results for all weights
		private maxFriction: number = 0.6;
				
		/** Currently used brush size */
		protected currentBrushSize: UI.BrushSize;
		
        /**
         * Set current brush size
         * @param   size    The new size of the brush (line thickness)
         */
        public SetBrushSize(size: UI.BrushSize): void {
            this.currentBrushSize = size;
        }		 
		
		private interpolateMass(brushSize: number): number {
			return this.minMass + (this.maxMass - this.minMass)*(brushSize - this.minBrushSize)/(this.maxBrushSize - this.minBrushSize);
		}
		
		private interpolateFriction(brushSize: number): number {
			return this.maxFriction - (this.maxFriction - this.minFriction)*(brushSize - this.minBrushSize)/(this.maxBrushSize - this.minBrushSize);
		}
				
		/**
		 * Each brush has different properties - larger brushes are heavier and have greater drag
		 */
		private brushes: { [size: number]: BrushInstance }  = {};
		private GetBrush(brushSize: number): BrushInstance {
			if(!this.brushes[brushSize]) {
				this.brushes[brushSize]	= new BrushInstance(this.interpolateMass(brushSize), this.interpolateFriction(brushSize), brushSize); 
				// this.brushes[brushSize]	= new BrushInstance(this.minMass, this.maxFriction, brushSize);
			}			
			return this.brushes[brushSize];
		}
		
		/**
		 * Initialise new instance of DynaDraw
		 */
		constructor(protected pathFactory: () => Path,
					private slowSimulation: boolean,
					private minBrushSize: number,
					private maxBrushSize: number,
					timer: VideoTimer) {
	
			// 						
			//this.cursor = new BrushTip(slowSimulation, timer); // when slow simulation is on, use width adjustments when moving fast
			this.cursor = new BrushTip(true, timer);
			
			// start the periodical simulation right away!
			if(slowSimulation === true) {
				requestAnimationFrame((time: number) => {
					this.lastAnimationTime = time;
					this.Tick(time)
				});
			} else {
				requestAnimationFrame(() => this.TickWhile());				
			}
		}
		
        /** Last state received. */
        protected lastState: CursorState;
        
        /**
         * Process next state and 
         */
        public ObserveCursorMovement(cursor: CursorState): void {
            try {
                var nextPoint = new Vector2(cursor.X, cursor.Y);
                if (cursor.Pressure > 0) {
                    if (!this.lastState || this.lastState.Pressure === 0) {
						
						// start a new path - prepare new chunk		
						this.path = this.pathFactory();				
						VideoEvents.trigger(VideoEventType.StartPath, this.path);
                        this.StartPath(nextPoint, cursor.Pressure);      
                    } else {
                        this.NextPoint(nextPoint, cursor.Pressure);
                    }
                } else if (this.lastState && this.lastState.Pressure > 0) {
                    this.EndPath(nextPoint, this.lastState.Pressure);
                }
            } catch (err) {
                console.log("ProcessNewState error: ", err);
            }
            
            this.lastState = cursor;
        }
		
		/**
		 * Start drawing a new path with a given color and brush size.
		 * @param	{Vector2}		position	Cursor state information
		 * @param	{number}		pressure	Cursor pressure
		 */
		public StartPath(position: Vector2, pressure: number) {
			this.cursor.Reset(position, this.GetBrush(this.currentBrushSize.Size));
			this.position = position;
			this.pressure = pressure;
			this.cursor.StartPath(this.path, position, pressure);
		}
		
		/**
		 * Animate cursor movement
		 * @param	{Vector2}		position	Cursor state information
		 * @param	{number}		pressure	Cursor pressure
		 */
		public NextPoint(position: Vector2, pressure: number) {
			this.position = position;
			this.pressure = pressure;
		}
		
		/**
		 * Stop drawing the line when the mouse or digital pen is released.
		 * @param	{Vector2}		position	Cursor state information
		 * @param	{number}		pressure	Cursor pressure
		 */
		public EndPath(position: Vector2, pressure: number) {
			this.position = position;			
		}
				
		/**
		 * Simulate brush's movement frame by frame as long as it keeps moving.
		 * This approach will be more responsive (the path will always reach the cursor before it moves in a different direction),
		 * but the resulting curves aren't as nice and smooth as with the regular simulation.
		 */
		private TickWhile() {
			if(!!this.position) {
				var d2: number = 0; // squared distance the brush has traveled
				var step: number = 0;
				do {
					d2 = this.cursor.ApplyForce(this.position, 1);
					step += d2;
					if(step > this.currentBrushSize.Size) { // distance traveled is at least sqrt(Size)
						this.cursor.Draw(this.path, this.pressure);
						step = 0;						
					}
				} while (d2 > 0);
				
				// draw the rest
				if(step > 0) {
					this.cursor.Draw(this.path, this.pressure);
				}
												
				this.position = null; // skip Apply(..) that will return false next time
			}
			
			// do the next tick
			requestAnimationFrame((time: number) => this.TickWhile()); // ~ 60 FPS
		}
				
		/** Animation timing values */
		private lastAnimationTime: number;
		private oneFrame: number = 1000 / 60; // 60 Hz in milliseconds
		
		private Tick(time: number) {
			if(!!this.position) {
				if(this.cursor.ApplyForce(this.position, (time - this.lastAnimationTime) / this.oneFrame) > 0) {
					this.cursor.Draw(this.path, this.pressure);
				} else {
					this.position = null; // skip Apply(..) that will return false next time	
				}
			}
			
			// do the next tick
			this.lastAnimationTime = time;
			requestAnimationFrame((time: number) => this.Tick(time)); // ~ 60 FPS
			//setTimeout(() => this.Tick(time + 1), 1); // ~ 1000 FPS
			//setTimeout(() => this.Tick(time + 30), 30); // ~ 30 FPS
			//setTimeout(() => this.Tick(time + 200), 200); // ~ 30 FPS
		}
	}	
	
	
	/**
	 * Set of brush properties that have effect on the outcome
	 */
	class BrushInstance {
		public get Mass(): number { return this.mass; }
		public get Friction(): number { return this.friction; }
		public get Size(): number { return this.size; }
		constructor(private mass: number, private friction: number, private size: number) { }
	}
	
	const enum Threshold {
		Force = 1,
		Velocity = 1
	}
	
	/**
	 * Brush with all it's physical properties
	 * - implementation of the "filter" in the original algorithm
	 */
	class BrushTip {
				
		/** Current cursor position */
		private position: Vector2;
		
		/** Last drawn position */
		private startPosition: Vector2;
		
		/** Current velicoity of the brush */
		private velocity: Vector2;
		
		/** Current acceleration of the tip of the brush */
		private acceleration: Vector2;
		
		/** Current rotation of the cursor */
		private angle: Vector2;
		
		/** Physical properties of the current brush. */
		private brush: BrushInstance;
		
		/** Mouse movement threshold - ingore too subtle mouse movements */
		private static threshold: number = 0.001;
		
		/** First segment must be treated differently */
		private firstSegment: boolean;
		
		/** Information needed for interpolating pressure */
		private previousPosition: Vector2;
		private previousPressure: number;
		private mousePosition: Vector2;
		
		constructor(private calculateSpeed: boolean, private timer: VideoTimer) { }
		
		/**
		 * @param	{Vector2}		position	The starting point of the cursor.
		 * @param	{BrushInstance} brush  		Physical properties of the brush.
		 */			
		public Reset(position: Vector2, brush: BrushInstance): void {
			this.brush = brush;
			this.position = position.clone();
			this.startPosition = position.clone();
			this.previousPosition = position.clone();
			this.previousPressure = -1; // negative means, there is no pressure information yet
			this.mousePosition = position.clone();
			this.acceleration = new Vector2(0, 0);
			this.velocity = new Vector2(0, 0);
			this.firstSegment = true;
		}
			
		/**
		 * Apply force created by mouse movement
		 * @param 	{Vector2}	mouse 			Mouse position
		 * @param	{number}	elapsedFrames	The number of frames elapsed since last movement
		 * @return	{number}					Brush movement distance squared 
		 */
		public ApplyForce(mouse: Vector2, elapsedFrames: number): number {			
			// calculate the force
			var force: Vector2 = mouse.clone().subtract(this.position);
			if(force.getSizeSq() < Threshold.Force) {
				return 0; // too subtle movement
			}
			
			// calculate acceleration and velocity
			this.acceleration = force.clone().scale(1/this.brush.Mass); // derived from the definition of force: (->)a = (->)f / m
			this.velocity.add(this.acceleration);
			if(this.velocity.getSizeSq() < Threshold.Velocity) {
				return 0; // nearly no movement (a "heavy" brush)
			}
			
		 	// destroy unnecessary references
		 	this.mousePosition = mouse.clone();
			mouse = null;
			force = null;	
			this.acceleration = null;
			
			// calculate the angle of the mouse
			this.angle = this.velocity.getNormal();
			
			// apply the drag of the digital drawing tool
			this.velocity.scale((1 - this.brush.Friction) * elapsedFrames); // more friction means less movement
			
			// update position
			this.position.add(this.velocity);	
						
			return this.velocity.getSizeSq(); // there is something to render
		}
		
		/**
		 * Draw next segment
		 */
		public Draw(path: Path, pressure: number): void {
			// the quicker the brush moves, the smaller print it leaves 
			var relativeSpeed: number = this.calculateSpeed === true ? this.velocity.getSize() / (this.brush.Size * this.brush.Size) : 0; // set to 0 if no speed correction is used
			var width: number = this.getRadius(pressure, relativeSpeed);
			this.angle.scale(width);
			if(this.firstSegment) {
				path.InitPath(this.startPosition.clone().add(this.angle), this.startPosition.clone().subtract(this.angle));
				this.firstSegment = false;
			}
			
			path.ExtendPath(this.position.clone().add(this.angle), this.position.clone().subtract(this.angle));
			path.Draw();
		}
		
		public StartPath(path: Path, pt: Vector2, pressure: number): void {
			path.StartPath(pt, this.getRadius(pressure, 0));
		} 
		
		/**
		 * Calculate current radius from pressure and speed of the cursor.
		 */
		private getRadius(pressure: number, speed: number): number {
			// I must interpolate the pressure between the last point and current pressure in the 
			if(this.previousPressure < 0) this.previousPressure = pressure;
			var interpolatedPressure: number = this.interpolatePressure(pressure);
			var radius: number = this.speedFactor(speed) * this.brush.Size * interpolatedPressure / 2;
			
			// save for next time
			this.previousPosition = this.position;
			this.previousPressure = interpolatedPressure;
			return radius;
		}
		
		/**
		 * Get current pressure - achieve smooth pressure gradients
		 */
		private interpolatePressure(mousePressure: number): number {
			var d1: number = this.position.distanceTo(this.previousPosition);
			var d2: number = this.position.distanceTo(this.mousePosition);
			if(d1 === 0 && d2 === 0) {
				return mousePressure; // I don't have to interpolate
			}
									
			return (d1/(d1 + d2))*(mousePressure - this.previousPressure) + this.previousPressure;
		}
		
		/**
		 * Determine the effect of the speed on thickness of the path
		 */
		private speedFactor(speed: number) : number {
			return Math.max(1 - speed, 0.4); 
		}
		
	}
}