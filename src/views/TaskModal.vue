<template>
  <div class="modal-overlay" v-if="visible">
    <div class="task-modal">
      <div class="modal-header">
        <h3>{{ editingTask ? '编辑任务' : '新建任务' }}</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      
      <div class="modal-content">
        <div class="form-section">
          <div class="form-row">
            <label for="description">任务描述</label>
            <input 
              type="text" 
              id="description" 
              v-model="taskData.description" 
              placeholder="请输入任务描述"
            >
          </div>
          
          <div class="form-row">
            <label for="executor">执行器</label>
            <select id="executor" v-model="taskData.executor">
              <option v-for="exec in executors" :key="exec.id" :value="exec.id">{{ exec.name }}</option>
            </select>
          </div>
          
          <div class="form-row">
            <label for="scheduleType">调度类型</label>
            <select id="scheduleType" v-model="taskData.scheduleType">
              <option value="CRON">CRON</option>
              <option value="FIXED_RATE">固定速率</option>
              <option value="FIXED_DELAY">固定延迟</option>
            </select>
          </div>
          
          <div class="form-row" v-if="taskData.scheduleType === 'CRON'">
            <label for="cron">Cron表达式</label>
            <div class="cron-input">
              <input 
                type="text" 
                id="cron" 
                v-model="taskData.cronExpression" 
                placeholder="如：0/5 * * * * ?"
              >
              <button class="gen-cron-btn">生成表达式</button>
            </div>
          </div>
          
          <div class="form-row" v-if="taskData.scheduleType !== 'CRON'">
            <label for="interval">执行间隔(秒)</label>
            <input 
              type="number" 
              id="interval" 
              v-model="taskData.interval" 
              min="1"
            >
          </div>
          
          <div class="form-row">
            <label for="runMode">运行模式</label>
            <select id="runMode" v-model="taskData.runMode">
              <option value="BEAN">BEAN</option>
              <option value="GLUE">GLUE</option>
              <option value="SCRIPT">SCRIPT</option>
            </select>
          </div>
          
          <div class="form-row" v-if="taskData.runMode === 'BEAN'">
            <label for="jobHandler">JobHandler</label>
            <input 
              type="text" 
              id="jobHandler" 
              v-model="taskData.jobHandler" 
              placeholder="请输入JobHandler名称"
            >
          </div>
          
          <div class="form-row">
            <label for="owner">负责人</label>
            <input 
              type="text" 
              id="owner" 
              v-model="taskData.owner" 
              placeholder="请输入负责人"
            >
          </div>
          
          <div class="form-row">
            <label for="subTasks">子任务</label>
            <input 
              type="text" 
              id="subTasks" 
              v-model="taskData.subTasks" 
              placeholder="可选，如：12,23,34"
            >
          </div>
          
          <div class="form-row">
            <label for="routeStrategy">路由策略</label>
            <select id="routeStrategy" v-model="taskData.routeStrategy">
              <option value="FIRST">第一个</option>
              <option value="LAST">最后一个</option>
              <option value="ROUND">轮询</option>
              <option value="RANDOM">随机</option>
            </select>
          </div>
          
          <div class="form-row advanced-row">
            <div class="section-title">
              <span>高级设置</span>
              <span class="arrow">▼</span>
            </div>
          </div>
          
          <div class="form-row">
            <label>失败重试</label>
            <div class="retry-options">
              <input 
                type="checkbox" 
                id="enableRetry" 
                v-model="taskData.enableRetry"
              >
              <label for="enableRetry">启用重试</label>
              <input 
                type="number" 
                v-model="taskData.retryCount" 
                min="0"
                :disabled="!taskData.enableRetry"
              >
              <label class="retry-label">次</label>
            </div>
          </div>
          
          <div class="form-row">
            <label for="timeout">任务超时时间</label>
            <div class="timeout-input">
              <input 
                type="number" 
                id="timeout" 
                v-model="taskData.timeout" 
                min="0"
              >
              <label class="unit-label">秒（0表示无超时）</label>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-btn" @click="close">取消</button>
        <button class="save-btn" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TaskModal',
  props: {
    visible: Boolean,
    currentTask: Object
  },
  data() {
    return {
      taskData: {
        id: null,
        description: '',
        executor: 'default',
        scheduleType: 'CRON',
        cronExpression: '',
        interval: 5,
        runMode: 'BEAN',
        jobHandler: '',
        owner: '',
        subTasks: '',
        routeStrategy: 'ROUND',
        enableRetry: true,
        retryCount: 3,
        timeout: 300
      },
      executors: [
        { id: 'default', name: '默认执行器' },
        { id: 'executor1', name: '订单服务执行器' },
        { id: 'executor2', name: '用户服务执行器' },
        { id: 'executor3', name: '报表服务执行器' }
      ]
    };
  },
  watch: {
    currentTask: {
      immediate: true,
      handler(newTask) {
        if (newTask) {
          // 复制任务数据，避免直接修改prop
          this.taskData = { ...newTask };
        } else {
          // 重置为新任务默认值
          this.resetForm();
        }
      }
    }
  },
  methods: {
    resetForm() {
      this.taskData = {
        id: null,
        description: '',
        executor: 'default',
        scheduleType: 'CRON',
        cronExpression: '',
        interval: 5,
        runMode: 'BEAN',
        jobHandler: '',
        owner: '',
        subTasks: '',
        routeStrategy: 'ROUND',
        enableRetry: true,
        retryCount: 3,
        timeout: 300
      };
    },
    close() {
      this.$emit('close');
      this.resetForm();
    },
    save() {
      // 表单验证
      if (!this.validateForm()) return;
      
      // 准备要保存的数据
      const savedTask = { ...this.taskData };
      
      // 通知父组件
      this.$emit('save', savedTask);
      
      // 关闭模态框
      this.close();
    },
    validateForm() {
      if (!this.taskData.description.trim()) {
        alert('请填写任务描述');
        return false;
      }
      
      if (this.taskData.scheduleType === 'CRON' && !this.taskData.cronExpression) {
        alert('请填写Cron表达式');
        return false;
      }
      
      if (this.taskData.runMode === 'BEAN' && !this.taskData.jobHandler) {
        alert('请填写JobHandler名称');
        return false;
      }
      
      if (!this.taskData.owner) {
        alert('请填写负责人');
        return false;
      }
      
      return true;
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow: hidden; /* 禁止页面滚动 */
}

.task-modal {
  width: 700px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden; /* 禁止模态框滚动 */
  max-height: 90vh; /* 限制最大高度 */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.modal-header h3 {
  margin: 0;
  color: #262626;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #1890ff;
}

.modal-content {
  padding: 24px;
  overflow: hidden; /* 禁止内容区域滚动 */
  max-height: calc(90vh - 120px); /* 120px是头部和底部的大约高度 */
}
.form-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.form-row {
  display: flex;
  align-items: center;
}

.form-row label {
  width: 120px;
  text-align: right;
  padding-right: 16px;
  color: #595959;
  font-size: 14px;
}

.form-row input,
.form-row select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  height: 36px;
}

.form-row input:focus,
.form-row select:focus {
  outline: none;
  border-color: #40a9ff;
}

.cron-input {
  display: flex;
  align-items: center;
  flex: 1;
}

.cron-input input {
  flex: 1;
  margin-right: 8px;
}

.gen-cron-btn {
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
}

.gen-cron-btn:hover {
  background: #40a9ff;
}

.advanced-row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e8e8e8;
}

.section-title {
  color: #1890ff;
  font-weight: 500;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.section-title .arrow {
  margin-left: 8px;
  font-size: 12px;
}

.retry-options {
  display: flex;
  align-items: center;
  flex: 1;
}

.retry-options input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
}

.retry-options input[type="number"] {
  width: 80px;
  margin-left: 12px;
}

.retry-label {
  margin-left: 8px;
  color: #595959;
}

.timeout-input {
  display: flex;
  align-items: center;
  flex: 1;
}

.timeout-input input {
  width: 100px;
  margin-right: 8px;
}

.unit-label {
  color: #8c8c8c;
  font-size: 13px;
}

.modal-footer {
  padding: 16px 24px;
  text-align: right;
  border-top: 1px solid #e8e8e8;
}

.cancel-btn {
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin-right: 8px;
}

.cancel-btn:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.save-btn {
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}

.save-btn:hover {
  background: #40a9ff;
}
</style>