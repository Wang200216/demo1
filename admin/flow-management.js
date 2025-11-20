/**
 * 辩论流程管理模块
 * 用于在后台管理系统中设置和控制直播的辩论流程
 * 支持多直播流独立配置
 */

// =====================================================================
// 1. 流程配置数据结构
// =====================================================================

/**
 * 流程步骤的默认配置
 * @type {Object}
 */
const DEFAULT_DEBATE_FLOW = {
	streamId: null,
	flowName: '标准辩论流程',
	steps: [
		{
			id: 'opening',
			name: '开篇陈述',
			description: '双方代表进行开篇陈述',
			duration: 60, // 秒
			leftParticipant: '正方',
			rightParticipant: '反方',
			type: 'statement',
			order: 1,
			enabled: true
		},
		{
			id: 'cross_examination',
			name: '交叉询问',
			description: '双方代表进行交叉询问和反驳',
			duration: 180,
			leftParticipant: '反方提问',
			rightParticipant: '正方回答',
			type: 'questioning',
			order: 2,
			enabled: true
		},
		{
			id: 'free_debate',
			name: '自由辩论',
			description: '双方自由发言辩论',
			duration: 300,
			leftParticipant: '正方',
			rightParticipant: '反方',
			type: 'debate',
			order: 3,
			enabled: true
		},
		{
			id: 'summary',
			name: '总结陈词',
			description: '双方代表总结陈词',
			duration: 120,
			leftParticipant: '正方',
			rightParticipant: '反方',
			type: 'statement',
			order: 4,
			enabled: true
		}
	],
	currentStepIndex: 0,
	isRunning: false,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString()
};

// =====================================================================
// 2. 流程管理API函数
// =====================================================================

/**
 * 获取指定直播流的辩论流程配置
 * @param {string} streamId - 直播流ID
 * @returns {Promise<Object>} 流程配置
 */
async function getDebateFlow(streamId) {
	try {
		const response = await fetch(`${API_BASE}/debate-flow?stream_id=${streamId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`获取流程配置失败: ${response.statusText}`);
		}

		const data = await response.json();
		return data.data || data;
	} catch (error) {
		console.error('❌ 获取辩论流程配置失败:', error);
		throw error;
	}
}

/**
 * 保存/更新辩论流程配置
 * @param {string} streamId - 直播流ID
 * @param {Object} flowConfig - 流程配置对象
 * @returns {Promise<Object>} 保存的配置
 */
async function saveDebateFlow(streamId, flowConfig) {
	try {
		const payload = {
			streamId,
			...flowConfig,
			updatedAt: new Date().toISOString()
		};

		const response = await fetch(`${API_BASE}/debate-flow`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`保存流程配置失败: ${response.statusText}`);
		}

		const data = await response.json();
		showNotification('流程配置已保存', 'success');
		return data.data || data;
	} catch (error) {
		console.error('❌ 保存辩论流程配置失败:', error);
		showNotification('保存流程配置失败', 'error');
		throw error;
	}
}

/**
 * 控制流程的执行（开始、暂停、恢复、重置等）
 * @param {string} streamId - 直播流ID
 * @param {string} action - 操作: start/pause/resume/reset/next/prev
 * @param {Object} options - 其他选项
 * @returns {Promise<Object>} 操作结果
 */
async function controlDebateFlow(streamId, action, options = {}) {
	try {
		const payload = {
			streamId,
			action,
			...options,
			timestamp: new Date().toISOString()
		};

		const response = await fetch(`${API_BASE}/debate-flow/control`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			throw new Error(`流程控制失败: ${response.statusText}`);
		}

		const data = await response.json();
		console.log(`✅ 流程操作 [${action}] 执行成功`);
		return data.data || data;
	} catch (error) {
		console.error(`❌ 流程操作 [${action}] 失败:`, error);
		throw error;
	}
}

// =====================================================================
// 3. UI渲染函数
// =====================================================================

/**
 * 初始化流程管理界面
 * @param {string} streamId - 直播流ID
 */
async function initFlowManagement(streamId) {
	try {
		// 加载现有配置
		let flowConfig;
		try {
			flowConfig = await getDebateFlow(streamId);
		} catch (error) {
			// 如果获取失败，使用默认配置
			console.warn('⚠️ 使用默认流程配置');
			flowConfig = JSON.parse(JSON.stringify(DEFAULT_DEBATE_FLOW));
			flowConfig.streamId = streamId;
		}

		// 渲染UI
		renderFlowManagementUI(streamId, flowConfig);
		
		// 绑定事件
		bindFlowManagementEvents(streamId, flowConfig);

		return flowConfig;
	} catch (error) {
		console.error('❌ 初始化流程管理失败:', error);
		showNotification('初始化流程管理失败', 'error');
	}
}

/**
 * 渲染流程管理UI
 * @param {string} streamId - 直播流ID
 * @param {Object} flowConfig - 流程配置
 */
function renderFlowManagementUI(streamId, flowConfig) {
	const container = document.getElementById('flow-management-container');
	if (!container) {
		console.warn('⚠️ 流程管理容器不存在，需要在HTML中添加');
		return;
	}

	let stepsHTML = '';
	flowConfig.steps.forEach((step, index) => {
		const isActive = index === flowConfig.currentStepIndex;
		const durationMinutes = Math.floor(step.duration / 60);
		const durationSeconds = step.duration % 60;

		stepsHTML += `
			<div class="flow-step ${isActive ? 'active' : ''} ${!step.enabled ? 'disabled' : ''}" 
			     data-step-id="${step.id}" 
			     data-step-index="${index}"
			     style="padding: 15px; margin-bottom: 10px; border: 2px solid ${isActive ? '#2196F3' : '#ddd'}; border-radius: 8px; background: ${isActive ? '#f3f7ff' : '#f9f9f9'}; cursor: pointer; transition: all 0.3s;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
					<div style="flex: 1;">
						<h4 style="margin: 0 0 5px 0; color: ${isActive ? '#2196F3' : '#333'};">
							${index + 1}. ${step.name}
							${step.enabled ? '<span style="color: #4CAF50;">[启用]</span>' : '<span style="color: #ff9800;">[禁用]</span>'}
						</h4>
						<p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">${step.description}</p>
					</div>
					<div style="text-align: right; margin-left: 15px;">
						<div style="font-size: 18px; font-weight: bold; color: #2196F3;">
							${durationMinutes}分${durationSeconds}秒
						</div>
						<div style="font-size: 12px; color: #999; margin-top: 5px;">
							${step.leftParticipant} vs ${step.rightParticipant}
						</div>
					</div>
				</div>
				
				<div style="display: flex; gap: 8px; margin-top: 10px;">
					<button class="btn btn-sm edit-step-btn" data-step-index="${index}" 
					        style="background: #2196F3; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
						编辑
					</button>
					<button class="btn btn-sm delete-step-btn" data-step-index="${index}" 
					        style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
						删除
					</button>
					<button class="btn btn-sm toggle-step-btn" data-step-index="${index}" 
					        style="background: ${step.enabled ? '#ff9800' : '#4CAF50'}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
						${step.enabled ? '禁用' : '启用'}
					</button>
					${index > 0 ? `
						<button class="btn btn-sm move-up-btn" data-step-index="${index}" 
						        style="background: #9C27B0; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
							↑ 上移
						</button>
					` : ''}
					${index < flowConfig.steps.length - 1 ? `
						<button class="btn btn-sm move-down-btn" data-step-index="${index}" 
						        style="background: #9C27B0; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
							↓ 下移
						</button>
					` : ''}
				</div>
			</div>
		`;
	});

	const controlButtonsHTML = `
		<div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
			<button class="btn btn-primary flow-start-btn" 
			        style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
				▶ 开始流程
			</button>
			<button class="btn btn-primary flow-pause-btn" 
			        style="background: #ff9800; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
				⏸ 暂停
			</button>
			<button class="btn btn-primary flow-resume-btn" 
			        style="background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
				▶ 继续
			</button>
			<button class="btn btn-primary flow-reset-btn" 
			        style="background: #9C27B0; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
				↻ 重置
			</button>
			<button class="btn btn-primary flow-next-btn" 
			        style="background: #00BCD4; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
				⏭ 下一步
			</button>
			<button class="btn btn-primary flow-add-step-btn" 
			        style="background: #8BC34A; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
				+ 添加步骤
			</button>
			<button class="btn btn-primary flow-save-btn" 
			        style="background: #673AB7; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; margin-left: auto;">
				💾 保存配置
			</button>
		</div>
	`;

	const flowStatusHTML = `
		<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
			<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
				<div>
					<label style="display: block; font-size: 12px; color: #999; margin-bottom: 5px;">流程名称</label>
					<input type="text" class="flow-name-input" value="${flowConfig.flowName}" 
					       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
				</div>
				<div>
					<label style="display: block; font-size: 12px; color: #999; margin-bottom: 5px;">当前步骤</label>
					<div style="padding: 8px; background: white; border-radius: 4px; border: 1px solid #ddd; font-size: 14px; font-weight: bold;">
						${flowConfig.steps[flowConfig.currentStepIndex]?.name || '未开始'}
					</div>
				</div>
				<div>
					<label style="display: block; font-size: 12px; color: #999; margin-bottom: 5px;">运行状态</label>
					<div style="padding: 8px; background: white; border-radius: 4px; border: 1px solid #ddd; font-size: 14px; font-weight: bold; color: ${flowConfig.isRunning ? '#4CAF50' : '#999'};">
						${flowConfig.isRunning ? '🟢 运行中' : '⚫ 已停止'}
					</div>
				</div>
				<div>
					<label style="display: block; font-size: 12px; color: #999; margin-bottom: 5px;">总步骤数</label>
					<div style="padding: 8px; background: white; border-radius: 4px; border: 1px solid #ddd; font-size: 14px; font-weight: bold;">
						${flowConfig.steps.length}
					</div>
				</div>
			</div>
		</div>
	`;

	container.innerHTML = `
		<div style="padding: 20px;">
			<h2 style="margin-top: 0; color: #333;">📋 辩论流程设置</h2>
			${flowStatusHTML}
			${controlButtonsHTML}
			<h3 style="color: #333; margin-bottom: 15px;">流程步骤</h3>
			<div class="flow-steps-container">
				${stepsHTML}
			</div>
		</div>
	`;

	// 存储当前配置到全局状态
	window.currentFlowConfig = flowConfig;
	window.currentFlowStreamId = streamId;
}

/**
 * 绑定流程管理事件
 * @param {string} streamId - 直播流ID
 * @param {Object} flowConfig - 流程配置
 */
function bindFlowManagementEvents(streamId, flowConfig) {
	const container = document.getElementById('flow-management-container');
	if (!container) return;

	// 流程控制按钮事件
	container.querySelector('.flow-start-btn')?.addEventListener('click', async () => {
		await controlDebateFlow(streamId, 'start');
		showNotification('流程已开始', 'success');
		setTimeout(() => initFlowManagement(streamId), 500);
	});

	container.querySelector('.flow-pause-btn')?.addEventListener('click', async () => {
		await controlDebateFlow(streamId, 'pause');
		showNotification('流程已暂停', 'success');
		setTimeout(() => initFlowManagement(streamId), 500);
	});

	container.querySelector('.flow-resume-btn')?.addEventListener('click', async () => {
		await controlDebateFlow(streamId, 'resume');
		showNotification('流程已继续', 'success');
		setTimeout(() => initFlowManagement(streamId), 500);
	});

	container.querySelector('.flow-reset-btn')?.addEventListener('click', async () => {
		if (confirm('确定要重置流程吗？')) {
			await controlDebateFlow(streamId, 'reset');
			showNotification('流程已重置', 'success');
			setTimeout(() => initFlowManagement(streamId), 500);
		}
	});

	container.querySelector('.flow-next-btn')?.addEventListener('click', async () => {
		await controlDebateFlow(streamId, 'next');
		showNotification('已进入下一步', 'success');
		setTimeout(() => initFlowManagement(streamId), 500);
	});

	container.querySelector('.flow-save-btn')?.addEventListener('click', async () => {
		const flowNameInput = container.querySelector('.flow-name-input');
		flowConfig.flowName = flowNameInput?.value || '标准辩论流程';
		await saveDebateFlow(streamId, flowConfig);
		showNotification('流程配置已保存', 'success');
	});

	container.querySelector('.flow-add-step-btn')?.addEventListener('click', () => {
		showAddStepModal(streamId, flowConfig);
	});

	// 编辑步骤按钮事件
	container.querySelectorAll('.edit-step-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const stepIndex = parseInt(btn.dataset.stepIndex);
			showEditStepModal(streamId, flowConfig, stepIndex);
		});
	});

	// 删除步骤按钮事件
	container.querySelectorAll('.delete-step-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const stepIndex = parseInt(btn.dataset.stepIndex);
			if (confirm(`确定要删除"${flowConfig.steps[stepIndex].name}"吗？`)) {
				flowConfig.steps.splice(stepIndex, 1);
				renderFlowManagementUI(streamId, flowConfig);
				bindFlowManagementEvents(streamId, flowConfig);
			}
		});
	});

	// 切换步骤启用状态
	container.querySelectorAll('.toggle-step-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const stepIndex = parseInt(btn.dataset.stepIndex);
			flowConfig.steps[stepIndex].enabled = !flowConfig.steps[stepIndex].enabled;
			renderFlowManagementUI(streamId, flowConfig);
			bindFlowManagementEvents(streamId, flowConfig);
		});
	});

	// 上移步骤
	container.querySelectorAll('.move-up-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const stepIndex = parseInt(btn.dataset.stepIndex);
			if (stepIndex > 0) {
				[flowConfig.steps[stepIndex - 1], flowConfig.steps[stepIndex]] = 
				[flowConfig.steps[stepIndex], flowConfig.steps[stepIndex - 1]];
				renderFlowManagementUI(streamId, flowConfig);
				bindFlowManagementEvents(streamId, flowConfig);
			}
		});
	});

	// 下移步骤
	container.querySelectorAll('.move-down-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const stepIndex = parseInt(btn.dataset.stepIndex);
			if (stepIndex < flowConfig.steps.length - 1) {
				[flowConfig.steps[stepIndex], flowConfig.steps[stepIndex + 1]] = 
				[flowConfig.steps[stepIndex + 1], flowConfig.steps[stepIndex]];
				renderFlowManagementUI(streamId, flowConfig);
				bindFlowManagementEvents(streamId, flowConfig);
			}
		});
	});
}

// =====================================================================
// 4. 模态框函数
// =====================================================================

/**
 * 显示添加步骤的模态框
 * @param {string} streamId - 直播流ID
 * @param {Object} flowConfig - 流程配置
 */
function showAddStepModal(streamId, flowConfig) {
	const modal = createModal('添加流程步骤', `
		<form id="add-step-form" style="display: grid; gap: 15px;">
			<div>
				<label style="display: block; margin-bottom: 5px; font-weight: bold;">步骤名称 *</label>
				<input type="text" name="name" placeholder="例如：开篇陈述" required 
				       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
			</div>
			<div>
				<label style="display: block; margin-bottom: 5px; font-weight: bold;">步骤描述</label>
				<textarea name="description" placeholder="详细描述此步骤的内容" rows="3"
				          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"></textarea>
			</div>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">时长（秒）*</label>
					<input type="number" name="duration" value="60" min="1" required 
					       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
				</div>
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">步骤类型</label>
					<select name="type" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
						<option value="statement">陈述</option>
						<option value="questioning">提问</option>
						<option value="debate">辩论</option>
						<option value="voting">投票</option>
						<option value="other">其他</option>
					</select>
				</div>
			</div>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">正方参与者</label>
					<input type="text" name="leftParticipant" placeholder="例如：正方代表" 
					       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
				</div>
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">反方参与者</label>
					<input type="text" name="rightParticipant" placeholder="例如：反方代表" 
					       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
				</div>
			</div>
			<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
				<button type="button" class="btn btn-secondary" onclick="closeModal()" 
				        style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
					取消
				</button>
				<button type="submit" class="btn btn-primary" 
				        style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
					确定
				</button>
			</div>
		</form>
	`);

	modal.querySelector('#add-step-form').addEventListener('submit', (e) => {
		e.preventDefault();
		const formData = new FormData(e.target);
		const newStep = {
			id: `step_${Date.now()}`,
			name: formData.get('name'),
			description: formData.get('description'),
			duration: parseInt(formData.get('duration')),
			type: formData.get('type'),
			leftParticipant: formData.get('leftParticipant') || '正方',
			rightParticipant: formData.get('rightParticipant') || '反方',
			order: flowConfig.steps.length + 1,
			enabled: true
		};

		flowConfig.steps.push(newStep);
		closeModal();
		renderFlowManagementUI(streamId, flowConfig);
		bindFlowManagementEvents(streamId, flowConfig);
		showNotification('步骤已添加', 'success');
	});
}

/**
 * 显示编辑步骤的模态框
 * @param {string} streamId - 直播流ID
 * @param {Object} flowConfig - 流程配置
 * @param {number} stepIndex - 步骤索引
 */
function showEditStepModal(streamId, flowConfig, stepIndex) {
	const step = flowConfig.steps[stepIndex];
	const modal = createModal('编辑流程步骤', `
		<form id="edit-step-form" style="display: grid; gap: 15px;">
			<div>
				<label style="display: block; margin-bottom: 5px; font-weight: bold;">步骤名称 *</label>
				<input type="text" name="name" value="${step.name}" required 
				       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
			</div>
			<div>
				<label style="display: block; margin-bottom: 5px; font-weight: bold;">步骤描述</label>
				<textarea name="description" rows="3"
				          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">${step.description || ''}</textarea>
			</div>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">时长（秒）*</label>
					<input type="number" name="duration" value="${step.duration}" min="1" required 
					       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
				</div>
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">步骤类型</label>
					<select name="type" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
						<option value="statement" ${step.type === 'statement' ? 'selected' : ''}>陈述</option>
						<option value="questioning" ${step.type === 'questioning' ? 'selected' : ''}>提问</option>
						<option value="debate" ${step.type === 'debate' ? 'selected' : ''}>辩论</option>
						<option value="voting" ${step.type === 'voting' ? 'selected' : ''}>投票</option>
						<option value="other" ${step.type === 'other' ? 'selected' : ''}>其他</option>
					</select>
				</div>
			</div>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">正方参与者</label>
					<input type="text" name="leftParticipant" value="${step.leftParticipant}" 
					       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
				</div>
				<div>
					<label style="display: block; margin-bottom: 5px; font-weight: bold;">反方参与者</label>
					<input type="text" name="rightParticipant" value="${step.rightParticipant}" 
					       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
				</div>
			</div>
			<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
				<button type="button" class="btn btn-secondary" onclick="closeModal()" 
				        style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
					取消
				</button>
				<button type="submit" class="btn btn-primary" 
				        style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
					保存
				</button>
			</div>
		</form>
	`);

	modal.querySelector('#edit-step-form').addEventListener('submit', (e) => {
		e.preventDefault();
		const formData = new FormData(e.target);
		step.name = formData.get('name');
		step.description = formData.get('description');
		step.duration = parseInt(formData.get('duration'));
		step.type = formData.get('type');
		step.leftParticipant = formData.get('leftParticipant');
		step.rightParticipant = formData.get('rightParticipant');

		closeModal();
		renderFlowManagementUI(streamId, flowConfig);
		bindFlowManagementEvents(streamId, flowConfig);
		showNotification('步骤已更新', 'success');
	});
}

// =====================================================================
// 5. 辅助函数
// =====================================================================

/**
 * 创建模态框
 * @param {string} title - 模态框标题
 * @param {string} content - 模态框内容HTML
 * @returns {HTMLElement} 模态框元素
 */
function createModal(title, content) {
	// 创建模态框容器
	const modal = document.createElement('div');
	modal.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	`;

	const modalContent = document.createElement('div');
	modalContent.style.cssText = `
		background: white;
		border-radius: 8px;
		padding: 30px;
		max-width: 500px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
	`;

	modalContent.innerHTML = `
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
			<h3 style="margin: 0; color: #333;">${title}</h3>
			<button class="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
		</div>
		<div>${content}</div>
	`;

	modal.appendChild(modalContent);
	document.body.appendChild(modal);

	// 关闭按钮事件
	modalContent.querySelector('.modal-close').addEventListener('click', () => closeModal());
	modal.addEventListener('click', (e) => {
		if (e.target === modal) closeModal();
	});

	// 存储模态框引用
	window.currentModal = modal;

	return modalContent;
}

/**
 * 关闭模态框
 */
function closeModal() {
	if (window.currentModal) {
		window.currentModal.remove();
		window.currentModal = null;
	}
}

/**
 * 显示通知
 * @param {string} message - 消息内容
 * @param {string} type - 通知类型: success/error/info/warning
 */
function showNotification(message, type = 'info') {
	const notification = document.createElement('div');
	const colors = {
		success: '#4CAF50',
		error: '#f44336',
		info: '#2196F3',
		warning: '#ff9800'
	};

	notification.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: ${colors[type] || colors.info};
		color: white;
		padding: 15px 20px;
		border-radius: 4px;
		z-index: 10001;
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
		animation: slideIn 0.3s ease-out;
	`;

	notification.textContent = message;
	document.body.appendChild(notification);

	setTimeout(() => {
		notification.style.animation = 'slideOut 0.3s ease-out';
		setTimeout(() => notification.remove(), 300);
	}, 3000);

	// 添加动画样式
	if (!document.querySelector('#notification-styles')) {
		const style = document.createElement('style');
		style.id = 'notification-styles';
		style.textContent = `
			@keyframes slideIn {
				from {
					transform: translateX(400px);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}
			@keyframes slideOut {
				from {
					transform: translateX(0);
					opacity: 1;
				}
				to {
					transform: translateX(400px);
					opacity: 0;
				}
			}
		`;
		document.head.appendChild(style);
	}
}

// =====================================================================
// 6. 导出函数供外部使用
// =====================================================================

window.FlowManagement = {
	init: initFlowManagement,
	getFlow: getDebateFlow,
	saveFlow: saveDebateFlow,
	controlFlow: controlDebateFlow,
	render: renderFlowManagementUI,
	DEFAULT_FLOW: DEFAULT_DEBATE_FLOW
};

