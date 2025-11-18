<template>
  <el-container class="system-layout">
    <!-- 左侧导航栏 - 使用 Element Menu -->
    <el-aside width="240px" class="nav-sidebar">
      <div class="system-name">任务调度中心</div>
      <el-menu
        default-active="1"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#fff"
        :unique-opened="true"
      >
        <el-menu-item index="1">
          <i class="el-icon-s-management"></i>
          <span>任务管理</span>
        </el-menu-item>
        <el-menu-item index="2">
          <i class="el-icon-cpu"></i>
          <span>执行器管理</span>
        </el-menu-item>
        <el-menu-item index="3">
          <i class="el-icon-document"></i>
          <span>执行日志</span>
        </el-menu-item>
        <el-menu-item index="4">
          <i class="el-icon-user"></i>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="5">
          <i class="el-icon-notebook-2"></i>
          <span>使用教程</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container class="content-container">
      <el-main class="content-area">
        <!-- 头部功能区 -->
        <el-row class="header-bar" justify="space-between" align="middle">
          <el-col :span="16">
            <el-row :gutter="16" align="middle">
              <!-- 执行器选择器 -->
              <el-col :span="6">
                <el-select v-model="selectedExecutor" placeholder="执行器">
                  <el-option label="全部" value="all"></el-option>
                  <el-option label="示例执行器" value="example"></el-option>
                </el-select>
              </el-col>
              
              <!-- 搜索框区域 -->
              <el-col :span="18">
                <el-row :gutter="10">
                  <el-col :span="7">
                    <el-input v-model="searchParams.desc" placeholder="任务描述" clearable></el-input>
                  </el-col>
                  <el-col :span="7">
                    <el-input v-model="searchParams.jobHandler" placeholder="JobHandler" clearable></el-input>
                  </el-col>
                  <el-col :span="7">
                    <el-input v-model="searchParams.owner" placeholder="负责人" clearable></el-input>
                  </el-col>
                  <el-col :span="3">
                    <el-button type="primary" @click="fetchTasks">搜索</el-button>
                  </el-col>
                </el-row>
              </el-col>
            </el-row>
          </el-col>
          
          <el-col :span="4" style="text-align: right;">
            <el-button type="primary" @click="showCreateModal" icon="el-icon-plus">新增</el-button>
          </el-col>
        </el-row>
        
        <!-- 任务列表表格 - 使用 Element Table -->
        <el-table
          :data="tasks"
          stripe
          border
          style="width: 100%; margin-top: 20px;"
        >
          <el-table-column prop="id" label="任务ID" width="100" />
          <el-table-column prop="description" label="任务描述" />
          <el-table-column prop="scheduleType" label="调度类型" width="200" />
          <el-table-column prop="runMode" label="运行模式" width="200" />
          <el-table-column prop="owner" label="负责人" width="120" />
          <el-table-column label="状态" width="120">
            <template #default="{row}">
              <el-tag :type="row.status === 'RUN' ? 'success' : 'danger'">
                {{ row.statusText }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="360" fixed="right">
            <template #default="{row}">
              <div class="action-buttons">
                <el-button size="small" @click="executeOnce(row)">执行</el-button>
                <el-button 
                  v-if="row.status === 'RUN'" 
                  size="small" 
                  type="warning"
                  @click="updateTaskStatus(row, 'STOP')"
                >
                  停止
                </el-button>
                <el-button 
                  v-else 
                  size="small" 
                  type="success"
                  @click="updateTaskStatus(row, 'RUN')"
                >
                  启动
                </el-button>
                <el-button size="small" @click="viewLogs(row)">日志</el-button>
                <el-button size="small" @click="showNodes(row)">节点</el-button>
                <el-button size="small" @click="editTask(row)">编辑</el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteTask(row)"
                >
                  删除
                </el-button>
                <el-button size="small" @click="copyTask(row)">复制</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页控制 -->
        <div class="pagination-bar">
          <el-pagination
            background
            layout="sizes, prev, pager, next"
            :page-sizes="[10, 20, 50]"
            :page-size="pageSize"
          >
          </el-pagination>
        </div>
      </el-main>
    </el-container>
    
    <!-- 任务创建/编辑模态框 - 使用 Element Dialog -->
    <el-dialog
      :title="editingTask ? '编辑任务' : '创建任务'"
      v-model="showModal"
      width="600px"
      destroy-on-close
    >
      <!-- TaskModal 组件保持不变 -->
      <TaskModal 
        v-if="showModal"
        :currentTask="editingTask"
        @close="showModal = false"
        @save="saveTask"
      />
    </el-dialog>
  </el-container>
</template>

<script>
import { ref } from 'vue';
import TaskModal from './TaskModal.vue';

export default {
  components: {
    TaskModal
  },
  setup() {
    return {
      selectedExecutor: ref('example'),
      pageSize: ref(10),
      showModal: ref(false),
      editingTask: ref(null),
      searchParams: ref({
        desc: '',
        jobHandler: '',
        owner: ''
      }),
      tasks: ref([
        {
          id: 1,
          description: '测试任务1',
          scheduleType: 'CRON:0/5 * * * * ?',
          runMode: 'BEAN: demo.JobHandler',
          owner: 'XXL',
          status: 'STOP',
          statusText: '已停止'
        }
      ])
    };
  },
  methods: {
    fetchTasks() {
      console.log('获取任务列表：', this.searchParams);
    },
    showCreateModal() {
      this.editingTask = null;
      this.showModal = true;
    },
    editTask(task) {
      this.editingTask = {...task};
      this.showModal = true;
    },
    saveTask(taskData) {
      console.log('保存任务：', taskData);
      this.showModal = false;
      
      if (taskData.id) {
        const index = this.tasks.findIndex(t => t.id === taskData.id);
        if (index !== -1) {
          this.tasks.splice(index, 1, taskData);
        }
      } else {
        const newId = Math.max(...this.tasks.map(t => t.id)) + 1;
        this.tasks.push({
          ...taskData,
          id: newId,
          status: 'STOP',
          statusText: '已停止'
        });
      }
    },
    updateTaskStatus(task, status) {
      task.status = status;
      task.statusText = status === 'RUN' ? '运行中' : '已停止';
      console.log(`更新任务状态：任务ID ${task.id} => ${status}`);
    },
    executeOnce(task) {
      console.log('执行一次任务：', task.id);
    },
    viewLogs(task) {
      console.log('查看任务日志：', task.id);
    },
    showNodes(task) {
      console.log('查看注册节点：', task.id);
    },
    deleteTask(task) {
      this.$confirm(`确定要删除任务 "${task.description}" 吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks.splice(index, 1);
          this.$message.success('任务删除成功');
        }
      }).catch(() => {});
    },
    copyTask(task) {
      const newId = Math.max(...this.tasks.map(t => t.id)) + 1;
      const newTask = {
        ...task,
        id: newId,
        description: task.description + ' - 副本',
        status: 'STOP',
        statusText: '已停止'
      };
      
      this.tasks.push(newTask);
      this.$message.success('任务复制成功');
    }
  }
};
</script>

<style scoped>
.no-scroll {
  overflow: hidden;
  height: 100vh;
}
.system-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左侧导航栏 - 固定定位 */
.nav-sidebar {
  background-color: #001529;
  color: #fff;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

.nav-sidebar {
  /* 原有样式保持不变 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.nav-sidebar::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}



.system-name {
  height: 64px;
  line-height: 64px;
  font-size: 18px;
  font-weight: bold;
  padding: 0 24px;
  position: sticky;
  top: 0;
  background-color: #001529;
  z-index: 1;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.system-name i {
  margin-right: 12px;
  font-size: 20px;
}

/* 右侧内容容器 */
.content-container {
  margin-left: 200px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 内容区域 - 可滚动 */
.content-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background-color: #f0f2f5;
}

/* 头部操作栏 */
.header-bar {
  background-color: #fff;
  padding: 16px 20px;
  margin-bottom: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* 表格容器 */
.el-table {
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* 分页样式 */
.pagination-wrapper {
  background-color: #fff;
  padding: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .nav-sidebar {
    width: 160px;
  }
  .content-container {
    margin-left: 160px;
  }
  .header-bar .el-col {
    width: 100%;
    margin-bottom: 12px;
  }
}

/* 按钮组间距调整 */
.el-button-group {
  margin-left: 8px;
}
.el-button-group .el-button {
  margin-left: 0 !important;
}

/* 表格操作按钮间距 */
.el-table .cell .el-button {
  margin-right: 8px;
}
.el-table .cell .el-button:last-child {
  margin-right: 0;
}

/* 状态标签样式 */
.el-tag {
  font-weight: 500;
  padding: 0 8px;
  height: 24px;
  line-height: 24px;
}

</style>