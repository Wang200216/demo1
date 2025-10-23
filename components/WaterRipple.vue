<template>
	<view class="water-ripple-container" @click="handleClick" @touchstart="handleTouchStart">
		<!-- 水纹容器 -->
		<canvas id="waterCanvas" type="2d" class="water-canvas"></canvas>

		<!-- 叠加的梯度光线效果 -->
		<view class="water-overlay"></view>

		<!-- 页面内容插槽 -->
		<view class="content-wrapper">
			<slot></slot>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'WaterRipple',
		data() {
			return {
				canvas: null,
				ctx: null,
				width: 0,
				height: 0,
				particles: [],
				ripples: [],
				animationId: null,
				isAnimating: false,
				backgroundColor: [255, 107, 157], // 粉红色作为基础
			}
		},
		mounted() {
			this.$nextTick(() => {
				this.initCanvas()
				this.startAnimation()
			})
		},
		beforeDestroy() {
			if (this.animationId) {
				cancelAnimationFrame(this.animationId)
			}
		},
		methods: {
			initCanvas() {
				const canvasEl = document.getElementById('waterCanvas')
				if (!canvasEl) return

				this.canvas = canvasEl
				this.ctx = this.canvas.getContext('2d')

				// 获取容器尺寸
				const container = this.$el
				this.width = container.clientWidth
				this.height = container.clientHeight

				// 设置 canvas 分辨率
				this.canvas.width = this.width
				this.canvas.height = this.height

				// 初始化粒子
				this.initializeParticles()
			},

			initializeParticles() {
				// 创建初始背景粒子效果
				this.particles = []
				const particleCount = Math.floor(this.width * this.height / 15000)

				for (let i = 0; i < particleCount; i++) {
					this.particles.push({
						x: Math.random() * this.width,
						y: Math.random() * this.height,
						vx: (Math.random() - 0.5) * 0.5,
						vy: (Math.random() - 0.5) * 0.5,
						radius: Math.random() * 1.5 + 0.5,
						opacity: Math.random() * 0.3 + 0.1,
						color: [
							Math.random() * 50 + 205, // R
							Math.random() * 100 + 155, // G
							Math.random() * 100 + 155  // B
						],
						life: Math.random() * 0.5 + 0.5
					})
				}
			},

			handleClick(event) {
				if (event.target === this.canvas || event.target.classList.contains('water-canvas')) {
					const rect = this.canvas.getBoundingClientRect()
					const x = event.clientX - rect.left
					const y = event.clientY - rect.top
					this.createRipple(x, y)
				}
			},

			handleTouchStart(event) {
				// 处理触屏事件
				if (event.touches.length > 0) {
					const rect = this.canvas.getBoundingClientRect()
					const touch = event.touches[0]
					const x = touch.clientX - rect.left
					const y = touch.clientY - rect.top
					this.createRipple(x, y)
				}
			},

			createRipple(x, y) {
				// 创建新的涟漪
				const ripple = {
					x: x,
					y: y,
					radius: 5,
					maxRadius: Math.min(this.width, this.height) * 0.6,
					opacity: 0.8,
					width: 40,
					speed: 3,
					color: [
						Math.random() * 100 + 155,
						Math.random() * 100 + 100,
						Math.random() * 100 + 155
					]
				}

				this.ripples.push(ripple)

				// 创建水滴粒子爆发
				this.createParticleBurst(x, y)
			},

			createParticleBurst(x, y) {
				const particleCount = 20 + Math.random() * 15
				const burstColor = [
					Math.random() * 50 + 200,
					Math.random() * 100 + 150,
					Math.random() * 50 + 200
				]

				for (let i = 0; i < particleCount; i++) {
					const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
					const speed = Math.random() * 3 + 2

					this.particles.push({
						x: x,
						y: y,
						vx: Math.cos(angle) * speed,
						vy: Math.sin(angle) * speed,
						radius: Math.random() * 2.5 + 1.5,
						opacity: 0.8,
						color: burstColor,
						life: 1,
						isArtificial: true
					})
				}
			},

			updateParticles() {
				for (let i = this.particles.length - 1; i >= 0; i--) {
					const p = this.particles[i]

					// 更新位置
					p.x += p.vx
					p.y += p.vy

					// 应用重力（轻微下沉效果）
					p.vy += 0.02

					// 边界反弹
					if (p.x < 0 || p.x > this.width) {
						p.vx *= -0.8
						p.x = Math.max(0, Math.min(this.width, p.x))
					}
					if (p.y < 0 || p.y > this.height) {
						p.vy *= -0.8
						p.y = Math.max(0, Math.min(this.height, p.y))
					}

					// 衰减
					if (p.isArtificial) {
						p.life -= 0.01
						p.opacity = p.life * 0.8
						if (p.life <= 0) {
							this.particles.splice(i, 1)
						}
					} else {
						p.opacity = Math.sin(Date.now() * 0.003 + i) * 0.15 + 0.15
					}
				}
			},

			updateRipples() {
				for (let i = this.ripples.length - 1; i >= 0; i--) {
					const r = this.ripples[i]
					r.radius += r.speed
					r.opacity -= 0.01

					if (r.radius >= r.maxRadius || r.opacity <= 0) {
						this.ripples.splice(i, 1)
					}
				}
			},

			drawParticles() {
				for (const p of this.particles) {
					const alpha = p.opacity
					this.ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha})`
					this.ctx.beginPath()
					this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
					this.ctx.fill()

					// 添加发光效果
					if (p.isArtificial && p.opacity > 0.5) {
						this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
						this.ctx.lineWidth = 0.5
						this.ctx.stroke()
					}
				}
			},

			drawRipples() {
				for (const r of this.ripples) {
					// 绘制涟漪主体
					this.ctx.strokeStyle = `rgba(${r.color[0]}, ${r.color[1]}, ${r.color[2]}, ${r.opacity * 0.6})`
					this.ctx.lineWidth = r.width * (1 - r.radius / r.maxRadius) // 渐细的边界
					this.ctx.beginPath()
					this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
					this.ctx.stroke()

					// 绘制内部渐变圆
					const gradient = this.ctx.createRadialGradient(r.x, r.y, r.radius * 0.5, r.x, r.y, r.radius)
					gradient.addColorStop(0, `rgba(255, 255, 255, ${r.opacity * 0.3})`)
					gradient.addColorStop(1, `rgba(${r.color[0]}, ${r.color[1]}, ${r.color[2]}, ${r.opacity * 0.1})`)

					this.ctx.fillStyle = gradient
					this.ctx.beginPath()
					this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
					this.ctx.fill()
				}
			},

			drawBackground() {
				// 绘制渐变背景（与页面背景配合）
				const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
				gradient.addColorStop(0, 'rgba(255, 107, 157, 0.1)')
				gradient.addColorStop(0.5, 'rgba(100, 220, 50, 0.05)')
				gradient.addColorStop(1, 'rgba(0, 200, 220, 0.08)')

				this.ctx.fillStyle = gradient
				this.ctx.fillRect(0, 0, this.width, this.height)
			},

			animate() {
				// 清空画布
				this.ctx.clearRect(0, 0, this.width, this.height)

				// 绘制背景
				this.drawBackground()

				// 更新和绘制
				this.updateParticles()
				this.updateRipples()
				this.drawParticles()
				this.drawRipples()

				// 继续动画
				this.animationId = requestAnimationFrame(() => this.animate())
			},

			startAnimation() {
				this.animate()
			}
		}
	}
</script>

<style scoped>
	.water-ripple-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		cursor: pointer;
	}

	.water-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: block;
		z-index: 1;
		pointer-events: auto;
	}

	.water-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background:
			radial-gradient(circle at 30% 15%, rgba(255, 100, 130, 0.15) 0%, transparent 40%),
			radial-gradient(circle at 80% 25%, rgba(0, 180, 220, 0.1) 0%, transparent 42%),
			radial-gradient(circle at 50% 75%, rgba(100, 220, 50, 0.12) 0%, transparent 48%);
		pointer-events: none;
		z-index: 2;
	}

	.content-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		z-index: 3;
		pointer-events: auto;
	}
</style>
