<template>
  <div class="task-scheduler">
    <!-- 左侧菜单导航 -->
    <div class="sidebar">
      <div class="logo">
        <i class="el-icon-cpu"></i>
        <span>任务调度中心</span>
      </div>

      <el-menu :default-active="activeMenuIndex.toString()" class="el-menu-vertical" background-color="#304156"
        text-color="#e4e7ed" active-text-color="#409EFF" @select="handleMenuSelect">
        <template v-for="(item, index) in menuItems">
          <!-- 有子菜单的项 -->
          <el-submenu v-if="item.children" :index="index.toString()" :key="index" popper-class="submenu-popper">
            <template #title>
              <i :class="item.icon"></i>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="(child, childIndex) in item.children" :key="childIndex"
              :index="`${index}-${childIndex}`">
              <i :class="child.icon"></i>
              <span>{{ child.title }}</span>
            </el-menu-item>
          </el-submenu>

          <!-- 无子菜单的项 -->
          <el-menu-item v-else :index="index.toString()" :key="index">
            <i :class="item.icon"></i>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
      <div class="system-info">
        <div class="current-time">{{ currentDateTime }}</div>
        <div class="resource-usage">
          <div class="cpu-chart">
            <span>CPU</span>
            <div class="chart-bar">
              <div class="chart-fill" :style="{ width: `${systemResources.cpu}%` }"></div>
            </div>
            <span>{{ systemResources.cpu }}%</span>
          </div>
          <div class="memory-chart">
            <span>内存</span>
            <div class="chart-bar">
              <div class="chart-fill" :style="{ width: `${systemResources.memory}%` }"></div>
            </div>
            <span>{{ systemResources.memory }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <div class="content-header">
        <div class="breadcrumb">
          <span @click="activeMenuIndex = 0">任务调度中心</span>
          <i class="el-icon-arrow-right"></i>
          <span>{{ activeMenuTitle }}</span>
        </div>
        <div class="system-status">
          <div class="status-pill running">
            <i class="el-icon-loading"></i>
            <span>运行中: {{ taskStats.running }}</span>
          </div>
          <div class="status-pill success">
            <i class="el-icon-success"></i>
            <span>成功: {{ taskStats.success }}</span>
          </div>
          <div class="status-pill waiting">
            <i class="el-icon-time"></i>
            <span>等待: {{ taskStats.waiting }}</span>
          </div>
          <div class="status-pill error">
            <i class="el-icon-error"></i>
            <span>异常: {{ taskStats.error }}</span>
          </div>
        </div>
      </div>
      <economic-calendar v-show="activeMenuIndex === 2"></economic-calendar>
      <service-center v-show="activeMenuIndex === 3"></service-center>
      <div class="content-container" v-show="activeMenuIndex === 1">
        <!-- 任务目录树 -->
        <div class="task-directory">
          <div class="directory-header">
            <h3><i class="el-icon-folder"></i> 任务目录</h3>
            <div class="directory-actions">
              <el-input v-model="directoryFilter" placeholder="搜索目录..." prefix-icon="el-icon-search" size="small" />
              <el-tooltip content="刷新目录" placement="top">
                <el-button size="small" icon="el-icon-refresh" @click="refreshDirectory"></el-button>
              </el-tooltip>
            </div>
          </div>

          <el-tree :data="taskDirectory" :props="directoryProps" node-key="guid" highlight-current
            :expand-on-click-node="false" @node-click="selectTaskDirectory" @node-contextmenu="handleRightClick"
            ref="directoryTree">
            <span class="custom-tree-node" slot-scope="{ node, data }">
              <div class="node-container">
                <!-- 动态应用图标类 -->
                <i :class="getFolderIconClass(node, data)"></i>
                <span class="node-label">{{ node.label }}</span>
                <span class="node-badge" v-if="data.taskCount">{{ data.taskCount }}</span>

                <el-tooltip content="添加子目录" placement="top" v-if="data.type === 'Namespace'">
                  <el-button type="text" icon="el-icon-folder-add" class="add-directory-btn"
                    @click.stop="showAddNamespaceDialog(data)"></el-button>
                </el-tooltip>
              </div>
            </span>
          </el-tree>
          <!-- 右键菜单组件 -->
          <div v-show="contextMenu.visible" class="context-menu"
            :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
            <el-menu class="el-menu-vertical-demo" @select="handleTreeMenuSelect">
              <el-menu-item index="delete">删除目录</el-menu-item>
            </el-menu>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="task-list" v-if="activeSubMenuIndex === '1-0'">
          <div class="task-list-header">
            <h3>
              <i class="el-icon-s-management"></i>
              {{ currentDirectoryName || '所有任务' }}
              <small v-if="filteredTasks.length">({{ filteredTasks.length }} 项任务)</small>
            </h3>
            <div class="task-actions">
              <el-button type="primary" size="small" @click="createTask">
                <i class="el-icon-plus"></i> 创建任务
              </el-button>
              <el-button v-if="currentTask" type="text" icon="el-icon-back" @click="backToTaskList">返回列表</el-button>
              <el-dropdown trigger="click">
                <el-button size="small">
                  <i class="el-icon-s-grid"></i> 视图选项<i class="el-icon-arrow-down el-icon--right"></i>
                </el-button>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item @click.native="switchView('grid')">
                    <i :class="['el-icon-menu', { 'active-view': currentView === 'grid' }]"></i>卡片视图
                  </el-dropdown-item>
                  <el-dropdown-item @click.native="switchView('list')">
                    <i :class="['el-icon-s-order', { 'active-view': currentView === 'list' }]"></i>列表视图
                  </el-dropdown-item>
                  <el-dropdown-item @click.native="switchView('chart')">
                    <i :class="['el-icon-s-data', { 'active-view': currentView === 'chart' }]"></i>统计视图
                  </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
              <el-button size="small" icon="el-icon-download" title="导出任务"></el-button>
            </div>
          </div>
          <div v-if="currentTask" class="detail-main-layout">

            <div class="task-detail-container">
              <div class="detail-header">
                <div class="task-icon">
                  <i :class="getTaskIcon(currentTask.type)"
                    :style="{ background: taskStatusColor(currentTask.status) }"></i>
                </div>
                <div class="task-title">
                  <h3>{{ currentTask.name }}</h3>
                  <div class="task-id">ID: {{ currentTask.id }}</div>
                </div>
                <div class="task-status">
                  <span class="status-badge" :class="currentTask.status">
                    {{ getStatusText(currentTask.status) }}
                  </span>
                </div>
              </div>

              <el-divider></el-divider>

              <!-- 编辑表单 -->
              <div class="scrollable-form">
                <el-scrollbar>
                  <el-form ref="editForm" :model="editFormData" :rules="formRules" label-width="160px"
                    class="compact-form">
                    <!-- 任务信息部分 - 优化后 -->
                    <div class="detail-section">
                      <h5 class="section-title"><i class="el-icon-document"></i> 任务信息</h5>
                      <el-row :gutter="12">
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="任务名称" prop="name" class="compact-item">
                            <el-input v-model="editFormData.name" placeholder="任务名称" size="small"></el-input>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="路径" class="compact-item">
                            <el-input v-model="editFormData.systemKernelObjectPath" placeholder="系统内核路径" disabled
                              size="small"></el-input>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="类型" prop="taskType" class="compact-item">
                            <el-input v-model="editFormData.taskType" placeholder="如：sparkTask" size="small"></el-input>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="资源类型" prop="resourceType" class="compact-item">
                            <el-select v-model="editFormData.resourceType" placeholder="资源类型" size="small">
                              <el-option label="CPU密集型" value="cpu"></el-option>
                              <el-option label="内存密集型" value="memory"></el-option>
                              <el-option label="GPU加速" value="gpu"></el-option>
                            </el-select>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="镜像路径" prop="imagePath" class="compact-item">
                            <el-input v-model="editFormData.imagePath" placeholder="镜像路径" size="small"></el-input>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="场景信息" class="compact-item">
                            <el-input v-model="editFormData.scenario" placeholder="场景信息" size="small"></el-input>
                          </el-form-item>
                        </el-col>
                      </el-row>
                    </div>

                    <!-- 配置信息部分 - 优化后 -->
                    <div class="detail-section">
                      <h5 class="section-title"><i class="el-icon-setting"></i> 配置信息</h5>
                      <el-row :gutter="12">
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="部署方法" prop="deploymentMethod" class="compact-item">
                            <el-input v-model="editFormData.deploymentMethod" placeholder="如：滚动部署" size="small"
                              clearable></el-input>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="优先级" prop="priority" class="compact-item">
                            <el-input-number v-model="editFormData.priority" :min="1" :max="10" size="small"
                              controls-position="right"></el-input-number>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="实际优先级" prop="actuallyPriority" class="compact-item">
                            <el-input-number v-model="editFormData.actuallyPriority" :min="1" :max="10" size="small"
                              controls-position="right"></el-input-number>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="调度类型" prop="kernelScheduleType" class="compact-item">
                            <el-select v-model="editFormData.kernelScheduleType" placeholder="调度类型" size="small">
                              <el-option label="手动执行" value="Manual"></el-option>
                              <el-option label="触发执行" value="Triggered"></el-option>
                              <el-option label="常驻执行" value="Resident"></el-option>
                              <el-option label="周期执行" value="Cycle"></el-option>
                              <el-option label="未定义" value="Undefined"></el-option>
                            </el-select>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="调度周期" prop="kernelScheduleCycle" class="compact-item">
                            <el-select v-model="editFormData.kernelScheduleCycle" placeholder="调度周期" size="small">
                              <el-option label="分钟" value="Minute"></el-option>
                              <el-option label="小时" value="Hour"></el-option>
                              <el-option label="每天" value="Day"></el-option>
                              <el-option label="每周" value="Week"></el-option>
                              <el-option label="每月" value="Month"></el-option>
                              <el-option label="未定义" value="Undefined"></el-option>
                            </el-select>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="是否空跑" prop="dryRun" class="compact-item switch-item">
                            <el-switch v-model="editFormData.dryRun" size="small"></el-switch>
                          </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                          <el-form-item label="是否启用" prop="enable" class="compact-item switch-item">
                            <el-switch v-model="editFormData.enable" size="small"></el-switch>
                          </el-form-item>
                        </el-col>
                      </el-row>
                    </div>

                    <!-- 任务描述部分 - 优化后 -->
                    <div class="detail-section">
                      <h5 class="section-title"><i class="el-icon-tickets"></i> 任务描述</h5>
                      <el-form-item prop="description" class="task-description-form-item compact-item">
                        <el-input type="textarea" v-model="editFormData.description"
                          :autosize="{ minRows: 4, maxRows: 8 }" placeholder="请输入任务描述" class="task-description-textarea"
                          resize="vertical"></el-input>
                      </el-form-item>
                    </div>

                    <!-- 额外信息部分 - 优化后 -->
                    <div v-if="editFormData.extraInformation" class="detail-section">
                      <h5 class="section-title"><i class="el-icon-folder-opened"></i> 额外信息</h5>
                      <pre class="extra-info compact-pre">
                    {{ JSON.stringify(editFormData.extraInformation, null, 2) }}
                  </pre>
                    </div>
                  </el-form>
                </el-scrollbar>
              </div>

            </div>
            <div class="detail-actions-vertical">
              <div class="button-group">
                <el-tooltip content="立即执行" placement="top">
                  <el-button type="primary" icon="el-icon-video-play" v-if="!editFormData.enable"
                    @click="startTask(currentTask)" class="responsive-button compact-icon" />
                </el-tooltip>

                <el-tooltip content="实例列表" placement="top">
                  <el-button type="info" icon="el-icon-s-order" @click="viewTaskInstances(currentTask)"
                    class="responsive-button compact-icon" />
                </el-tooltip>

                <el-tooltip content="停止任务" placement="top">
                  <el-button type="warning" icon="el-icon-video-pause" v-if="editFormData.enable"
                    @click="stopTask(currentTask)" class="responsive-button compact-icon" />
                </el-tooltip>
              </div>

              <div class="button-group">
                <el-tooltip content="返回列表" placement="top">
                  <el-button icon="el-icon-back" @click="backToTaskList" class="responsive-button compact-icon" />
                </el-tooltip>
              </div>

              <div class="button-group">
                <el-tooltip content="删除任务" placement="top">
                  <el-button type="danger" icon="el-icon-delete" @click="deleteTask(currentTask)"
                    class="responsive-button compact-icon" />
                </el-tooltip>

                <el-tooltip content="保存修改" placement="top">
                  <el-button type="success" icon="el-icon-check" @click="submitEdit"
                    class="responsive-button compact-icon" />
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 运维中心视图 -->
      <div v-if="activeSubMenuIndex === '1-1'" class="instance-table">
        <div class="task-list-header">
          <h3>
            <i class="el-icon-monitor"></i>
            {{ currentTaskForInstances ? currentTaskForInstances.name + ' 的实例' : '任务实例运维中心' }}
            <small v-if="instanceList.length">({{ instanceList.length }} 个实例)</small>
          </h3>
          <div class="task-actions">
            <el-select v-model="instanceStatusFilter" placeholder="状态筛选" size="small"
              style="width: 120px; margin-right: 10px;">
              <el-option label="所有状态" value=""></el-option>
              <el-option label="运行中" value="RUNNING"></el-option>
              <el-option label="已完成" value="FINISHED"></el-option>
              <el-option label="等待中" value="WAITING"></el-option>
              <el-option label="异常" value="ERROR"></el-option>
            </el-select>
            <el-button v-if="currentTaskForInstances" size="small" icon="el-icon-back" @click="showAllInstances">
              返回全部实例
            </el-button>
            <el-input v-model="instanceFilter" placeholder="搜索实例..." prefix-icon="el-icon-search" size="small"
              style="width: 200px;" />
            <el-button size="small" icon="el-icon-refresh"
              @click="fetchInstanceData(currentTaskForInstances?.systemKernelObjectPath)">
              刷新
            </el-button>
          </div>
        </div>

        <!-- 实例详情视图 -->
        <div v-if="currentInstance" class="instance-detail-view">
          <div class="view-header">
            <el-button type="text" icon="el-icon-arrow-left" @click="currentInstance = null" class="back-button">
              返回列表
            </el-button>
            <h2>
              <i class="el-icon-info"></i>
              {{ currentInstance.taskName + "对应的实例" + currentInstance.instanceName }} 详情
            </h2>
          </div>

          <div class="instance-detail-container">
            <!-- 基本信息 -->
            <div class="detail-section card-style">
              <div class="section-header">
                <i class="el-icon-info"></i>
                <h4>基本信息</h4>
              </div>
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="detail-item">
                    <label>实例名称：</label>
                    <span class="highlight-text">{{ currentInstance.instanceName }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>所属任务：</label>
                    <span class="highlight-text">{{ currentInstance.taskName }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>实例GUID：</label>
                    <span class="guid-value">{{ currentInstance.guid }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>任务GUID：</label>
                    <span class="guid-value">{{ currentInstance.taskGuid }}</span>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- 状态与调度信息 -->
            <div class="detail-section card-style">
              <div class="section-header">
                <i class="el-icon-monitor"></i>
                <h4>状态与调度</h4>
              </div>
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="detail-item">
                    <label>运行状态：</label>
                    <el-tag :type="getStatusTagType(currentInstance.runStatus)" size="medium">
                      {{ getStatusText(currentInstance.runStatus) }}
                    </el-tag>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>运行次数：</label>
                    <span class="highlight-number">{{ currentInstance.runCount }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>调度类型：</label>
                    <span>{{ getScheduleTypeText(currentInstance.kernelScheduleType) }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>调度周期：</label>
                    <span>{{ getScheduleCycleText(currentInstance.kernelScheduleCycle) }}</span>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- 时间信息 -->
            <div class="detail-section card-style">
              <div class="section-header">
                <i class="el-icon-time"></i>
                <h4>时间信息</h4>
              </div>
              <el-row :gutter="20">
                <el-col :span="12">
                  <div class="detail-item">
                    <label>创建时间：</label>
                    <span class="time-value">{{ formatDateTime(currentInstance.createTime) }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>最后启动：</label>
                    <span class="time-value">{{ formatDateTime(currentInstance.lastStartTime) }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>最后完成：</label>
                    <span class="time-value">{{ formatDateTime(currentInstance.lastEndTime) }}</span>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>业务时间：</label>
                    <span class="time-value">{{ formatDateTime(currentInstance.businessTime) }}</span>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- 配置信息 -->
            <div class="detail-section card-style">
              <div class="section-header">
                <i class="el-icon-setting"></i>
                <h4>配置信息</h4>
              </div>
              <el-row :gutter="20">
                <el-col :span="24">
                  <div class="detail-item">
                    <label>镜像路径：</label>
                    <span class="path-value">{{ currentInstance.imagePath }}</span>
                  </div>
                </el-col>
                <el-col :span="24">
                  <div class="detail-item">
                    <label>任务类型：</label>
                    <el-tag type="info" size="medium">
                      {{ currentInstance.taskType }}
                    </el-tag>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>实际优先级：</label>
                    <el-tag type="danger" size="medium">
                      {{ currentInstance.actuallyPriority }}级
                    </el-tag>
                  </div>
                </el-col>
                <el-col :span="12">
                  <div class="detail-item">
                    <label>基础优先级：</label>
                    <el-tag type="info" size="medium">
                      {{ currentInstance.priority }}
                    </el-tag>
                  </div>
                </el-col>
              </el-row>
            </div>

            <!-- 错误信息 -->
            <div v-if="currentInstance.errorCause" class="detail-section error-card">
              <div class="section-header">
                <i class="el-icon-warning"></i>
                <h4>错误信息</h4>
              </div>
              <div class="error-container">
                <pre class="error-pre">{{ currentInstance.errorCause }}</pre>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="view-actions-fixed">
              <el-button type="primary" @click="restartInstance(currentInstance)"
                v-if="currentInstance && currentInstance.runStatus !== 'RUNNING'">
                <i class="el-icon-refresh-left"></i> 重新启动
              </el-button>
              <el-button type="danger" @click="deleteInstance(currentInstance)">
                <i class="el-icon-delete"></i> 删除实例
              </el-button>
            </div>
          </div>
        </div>

        <!-- 实例列表 -->
        <div v-else>
          <el-table :data="pagedInstanceList" :key="tableKey" v-loading="instanceLoading" style="width: 100%"
            height="calc(100vh - 270px)" stripe border>
            <el-table-column prop="taskName" label="任务名称" width="110" sortable />
            <el-table-column prop="instanceName" label="实例名称" width="200" />
            <el-table-column prop="imagePath" label="镜像路径" width="200" />
            <el-table-column prop="taskType" label="任务类型" width="120" />
            <el-table-column prop="runCount" label="运行次数" width="110" />
            <el-table-column prop="createTime" label="创建时间" width="160" />

            <el-table-column prop="runStatus" label="运行状态" width="110">
              <template #default="{ row }">
                {{ getStatusText(row.runStatus) }}
              </template>
            </el-table-column>

            <el-table-column prop="actuallyPriority" label="优先级" width="100" align="center" sortable>
              <template #default="{ row }">
                {{ row.actuallyPriority }}级
              </template>
            </el-table-column>

            <el-table-column label="操作" align="center" width="200">
              <template #default="{ row }">
                <div class="action-container">
                  <el-button type="text" @click="viewInstanceDetails(row)">实例详情</el-button>
                  <el-button type="text" @click="deleteInstance(row)" style="color:#F56C6C">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination small background layout="prev, pager, next" :total="instancePagination.total"
            :page-size="instancePagination.pageSize" :current-page.sync="instancePagination.currentPage"
            @current-change="handleCurrentChange" style="margin-top: 15px; text-align: right;" />
        </div>
      </div>
    </div>
    <el-dialog :visible.sync="addNamespaceDialogVisible" title="添加新目录" width="30%">
      <el-form :model="newNamespaceForm" label-width="80px">
        <el-form-item label="目录名称" prop="name">
          <el-input v-model="newNamespaceForm.name" placeholder="请输入新目录名称"></el-input>
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="addNamespaceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addNewNamespace">确 定</el-button>
      </span>

    </el-dialog>
    <!-- 新建任务对话框 -->
    <el-dialog :visible.sync="createDialogVisible" title="创建新任务" width="40%" @closed="resetTaskForm">
      <el-form ref="taskForm" :model="addTaskData" :rules="formRules" label-width="160px">
        <!-- 任务名称 -->
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="addTaskData.name" placeholder="请输入任务名称"></el-input>
        </el-form-item>

        <!-- 任务类型 -->
        <el-form-item label="任务类型" prop="taskType">
          <el-input v-model="addTaskData.taskType" placeholder="请输入任务类型（如：SparkTask等）">
          </el-input>
        </el-form-item>

        <el-form-item label="系统任务类型" prop="taskType">
          <el-input v-model="addTaskData.categoryType" placeholder="请输入系统任务分类">
          </el-input>
        </el-form-item>

        <!-- 镜像路径 -->
        <el-form-item label="镜像路径" prop="imagePath">
          <el-input v-model="addTaskData.imagePath" placeholder="请输入镜像路径"></el-input>
        </el-form-item>

        <!-- 资源类型 -->
        <el-form-item label="资源类型" prop="resourceType">
          <el-select v-model="addTaskData.resourceType" placeholder="请选择资源类型" style="width: 100%">
            <el-option label="CPU密集型" value="cpu"></el-option>
            <el-option label="内存密集型" value="memory"></el-option>
            <el-option label="GPU加速" value="gpu"></el-option>
          </el-select>
        </el-form-item>

        <!-- 部署方法 -->
        <el-form-item label="部署方法" prop="deploymentMethod">
          <el-radio-group v-model="addTaskData.deploymentMethod">
            <el-radio label="滚动部署"></el-radio>
            <el-radio label="蓝绿部署"></el-radio>
            <el-radio label="金丝雀发布"></el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 优先级 -->
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="addTaskData.priority" :min="1" :max="10"
            controls-position="right"></el-input-number>
        </el-form-item>

        <!-- 实际优先级 -->
        <el-form-item label="实际优先级" prop="actuallyPriority">
          <el-input-number v-model="addTaskData.actuallyPriority" :min="1" :max="10"
            controls-position="right"></el-input-number>
        </el-form-item>

        <!-- 调度周期 -->
        <el-form-item label="调度周期" prop="kernelScheduleCycle">
          <el-select v-model="addTaskData.kernelScheduleCycle" placeholder="请选择调度周期" style="width: 100%">
            <el-option label="分钟" value="Minute"></el-option>
            <el-option label="小时" value="Hour"></el-option>
            <el-option label="每天" value="Day"></el-option>
            <el-option label="每周" value="Week"></el-option>
            <el-option label="每月" value="Month"></el-option>
            <el-option label="未定义" value="Undefined"></el-option>
          </el-select>
        </el-form-item>

        <!-- 调度类型 -->
        <el-form-item label="调度类型" prop="kernelScheduleType">
          <el-select v-model="addTaskData.kernelScheduleType" placeholder="请选择调度类型" style="width: 100%">
            <el-option label="手动执行" value="Manual"></el-option>
            <el-option label="触发执行" value="Triggered"></el-option>
            <el-option label="常驻执行" value="Resident"></el-option>
            <el-option label="周期执行" value="Cycle"></el-option>
            <el-option label="未定义" value="Undefined"></el-option>
          </el-select>
        </el-form-item>

        <!-- 是否空跑 -->
        <el-form-item label="是否空跑" prop="dryRun">
          <el-switch v-model="addTaskData.dryRun"></el-switch>
        </el-form-item>

        <!-- 是否启用 -->
        <el-form-item label="是否启用" prop="enable">
          <el-switch v-model="addTaskData.enable"></el-switch>
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNewTask">确 定</el-button>
      </span>
    </el-dialog>

  </div>
</template>

<script>
import axios from 'axios';
import ServiceCenter from '@/components/ServiceCenter.vue';
import EconomicCalendar from '@/components/EconomicCalendar.vue';

export default {
  name: 'TaskScheduler',
  components: {
    ServiceCenter,
    EconomicCalendar
  },
  data() {
    return {
      currentInstance: null, // 当前查看的实例详情
      newParentPath: '', // 新增：存储当前任务的父路径
      instanceStatusFilter: '',
      instanceDetailDialogVisible: false,
      instanceLoadingDetail: false, // 加载详情状态
      currentTaskForInstances: null,
      activeSubMenuIndex: '1-0', // 当前激活的子菜单索引
      instanceList: [], // 存储实例列表数据
      instanceLoading: false, // 加载状态
      instancePagination: { pageSize: 6, currentPage: 1, total: 0 },
      expandedKeys: [], // 保存已展开节点的key
      editingTaskParentPath: '', // 新增：存储当前编辑任务的父路径
      editDialogVisible: false, // 编辑对话框显示状态
      isEditing: false, // 编辑状态
      editFormData: {  // 编辑表单数据
        name: '',
        taskType: '',
        imagePath: '',
        resourceType: '',
        deploymentMethod: '滚动部署',
        priority: 1,
        actuallyPriority: 1,
        dryRun: false,
        kernelScheduleCycle: 'Day',
        kernelScheduleType: 'Resident',
        enable: false,
        description: ''
      },
      editingTask: null,        // 当前正在编辑的任务
      currentSelectedNode: null,
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        node: null
      },
      addNamespaceDialogVisible: false,
      currentDirectoryPath: '',
      newNamespaceForm: {
        name: ''
      },
      currentView: 'list',
      createDialogVisible: false,
      taskTypeOptions: [
        { label: '数据处理', value: 'data_processing' },
        { label: '模型训练', value: 'model_training' },
        { label: '实时推理', value: 'realtime_inference' },
        { label: '批量作业', value: 'batch_job' },
        { label: '监控任务', value: 'monitoring' }
      ],
      addTaskData: {
        name: '',
        taskType: '',
        categoryType: '',
        imagePath: '',
        resourceType: '',
        deploymentMethod: '滚动部署',
        priority: 1,
        actuallyPriority: 1,
        dryRun: false,
        kernelScheduleCycle: 'Day',
        kernelScheduleType: 'Resident',
        enable: true
      },
      formRules: {
        name: [
          { required: true, message: '请输入任务名称', trigger: 'blur' },
          { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' }
        ],
        taskType: [
          { required: true, message: '请选择任务类型', trigger: 'change' }
        ],
        imagePath: [
          { required: true, message: '请输入镜像路径', trigger: 'blur' }
        ],
        resourceType: [
          { required: true, message: '请选择资源类型', trigger: 'change' }
        ],
        deploymentMethod: [
          { required: true, message: '请选择部署方法', trigger: 'change' }
        ]
      },
      activeMenuIndex: 1,
      menuItems: [
        { title: "系统概览", icon: "el-icon-s-marketing" },
        {
          title: "任务管理",
          icon: "el-icon-tickets",
          children: [
            { title: "任务列表", icon: "el-icon-s-order" },
            { title: "运维中心", icon: "el-icon-monitor" }
          ]
        },
        { title: "经济事件日历", icon: "el-icon-date" },
        { title: "服务中心", icon: "el-icon-time" },
        { title: "执行日志", icon: "el-icon-monitor" },
        { title: "告警中心", icon: "el-icon-bell" },
        { title: "系统设置", icon: "el-icon-setting" }

      ],
      instanceFilter: '',
      directoryFilter: '',
      currentDirectoryId: null,
      hoveredTaskId: null,
      detailDialogVisible: false,
      currentTask: null,
      currentTaskDetail: null,
      systemResources: {
        cpu: 23,
        memory: 58
      },
      taskStats: {
        running: 23,
        success: 128,
        waiting: 45,
        error: 5
      },
      taskDirectory: [],
      directoryProps: {
        children: 'children',
        label: 'label'
      },
      allTasks: []
    };
  },
  computed: {
    pagedInstanceList() {
      const start = (this.instancePagination.currentPage - 1) * this.instancePagination.pageSize;
      const end = start + this.instancePagination.pageSize;
      return this.filteredInstanceList.slice(start, end);
    },

    // 添加过滤后的实例列表计算属性
    /*  filteredInstanceList() {
       if (!this.instanceFilter) return this.instanceList;
       
       const filter = this.instanceFilter.toLowerCase();
       return this.instanceList.filter(instance => 
         instance.taskName.toLowerCase().includes(filter) ||
         instance.instanceName.toLowerCase().includes(filter) ||
         instance.instanceStatus.toLowerCase().includes(filter)
       );
     }, */
    filteredInstanceList() {
      let list = this.instanceList;

      // 应用状态筛选（新增部分）
      if (this.instanceStatusFilter) {
        list = list.filter(instance =>
          instance.runStatus === this.instanceStatusFilter
        );
      }

      // 原有搜索筛选
      if (this.instanceFilter) {
        const filter = this.instanceFilter.toLowerCase();
        list = list.filter(instance =>
          instance.taskName.toLowerCase().includes(filter) ||
          instance.instanceName.toLowerCase().includes(filter) ||
          instance.runStatus.toLowerCase().includes(filter)
        );
      }
      return list;
    },
    currentDirectoryName() {
      // 使用路径代替原来的查找方法
      if (!this.currentDirectoryPath) return '所有任务';
      const parts = this.currentDirectoryPath.split('/');
      return parts[parts.length - 1] || '所有任务';
    },

    activeMenuTitle() {
      return this.menuItems[this.activeMenuIndex].title;
    },
    currentDateTime() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const weekday = weekdays[now.getDay()];

      return `${year}-${month}-${day} ${hours}:${minutes} ${weekday}`;
    },
    /*     currentDirectoryName() {
          const findNode = (nodes, id) => {
            for (const node of nodes) {
              if (node.id === id) return node.label;
              if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
              }
            }
            return null;
          };
          
          return this.currentDirectoryId ? 
            findNode(this.taskDirectory, this.currentDirectoryId) : 
            '所有任务';
        }, */
    filteredTasks() {
      if (!this.currentDirectoryId) return this.allTasks;

      return this.allTasks.filter(task => {
        return task.directoryId === this.currentDirectoryId;
      });
    }
  },
  methods: {
    getStatusTagType(status) {
      const statusMap = {
        'RUNNING': 'success',
        'FINISHED': '',
        'ERROR': 'danger',
        'WAITING': 'warning'
      };
      return statusMap[status] || 'info';
    },
    viewInstanceDetails(instance) {
      // 直接从实例列表数据中查找对应实例
      const foundInstance = this.instanceList.find(
        item => item.guid === instance.guid
      );

      if (foundInstance) {
        this.currentInstance = foundInstance;
      } else {
        this.$message.warning('未找到实例详情信息');
        this.currentInstance = null;
      }
    },
    async viewTaskInstances(task) {
      // 保存当前任务用于显示标题
      this.currentTaskForInstances = task;

      // 获取任务路径
      const taskPath = task.systemKernelObjectPath || task.komPath;
      if (!taskPath) {
        this.$message.warning('无法获取任务路径');
        return;
      }


      await this.fetchInstanceData(taskPath);
      this.activeMenuIndex = 1;
      // 切换到运维中心视图
      this.activeSubMenuIndex = '1-1';
    },
    getScheduleCycleText(cycle) {
      const cycleMap = {
        Minute: '每分钟',
        Hour: '每小时',
        Day: '每天',
        Week: '每周',
        Month: '每月',
        Undefined: '未定义'
      };
      return cycleMap[cycle] || cycle;
    },
    // 转换调度类型文本
    getScheduleTypeText(type) {
      const typeMap = {
        Manual: '手动执行',
        Triggered: '触发执行',
        Resident: '常驻执行',
        Cycle: '周期执行',
        Undefined: '未定义'
      };
      return typeMap[type] || type;
    },
    // 分页方法
    handleSizeChange(pageSize) {
      this.instancePagination.pageSize = pageSize;
      this.instancePagination.currentPage = 1;
    },

    handleCurrentChange(currentPage) {
      this.instancePagination.currentPage = currentPage;
      this.fetchInstanceData();
    },
    async fetchInstanceData(taskPath = null) {
      this.instanceLoading = true;
      try {
        let url = 'http://localhost:8080/api/v2/task/instance/query/all/task/instance';
        const params = {};

        // 如果有任务路径，则查询特定任务的实例
        if (taskPath) {
          url = 'http://localhost:8080/api/v2/task/instance/query/task/instance';
          params.path = taskPath;
        }

        const response = await axios.get(url, { params });

        if (response.data.code === 200) {
          this.instanceList = response.data.data;
          this.instancePagination.total = this.instanceList.length;
        } else {
          this.$message.error('获取实例数据失败: ' + response.data.msg);
        }
      } catch (error) {
        console.error('获取实例数据失败', error);
        this.$message.error('获取实例数据失败: ' + error.message);
      } finally {
        this.instanceLoading = false;
      }
    },
    showAllInstances() {
      this.currentTaskForInstances = null;
      this.fetchInstanceData(); // 不传参数获取全部实例
    },
    cancelEdit() {
      // 恢复原始数据
      this.updateEditForm(this.currentTask);
      this.$message.info('已取消编辑');
    },
    updateEditForm(task) {
      this.editFormData = {
        name: task.name,
        taskType: task.type,
        imagePath: task.imagePath,
        resourceType: task.resourceType,
        deploymentMethod: task.deploymentMethod || '滚动部署',
        priority: task.priority,
        actuallyPriority: task.actuallyPriority || 1,
        dryRun: task.dryRun || false,
        kernelScheduleCycle: task.scheduleCycleCode,
        kernelScheduleType: task.scheduleTypeCode,
        enable: task.enable,
        description: task.description || ''
      };
    },
    openEditDialog(task) {
      this.editingTask = task;
      this.editingTaskParentPath = this.getParentPath(task.path); // 获取并存储父路径
      console.log(task);
      this.editFormData = {
        name: task.name,
        taskType: task.type,
        imagePath: task.imagePath,
        resourceType: task.resourceType,
        deploymentMethod: task.deploymentMethod || '滚动部署',
        priority: task.priority,
        actuallyPriority: task.actuallyPriority || 1,
        dryRun: task.dryRun || false,
        kernelScheduleCycle: task.scheduleCycleCode,
        kernelScheduleType: task.scheduleTypeCode,
        enable: task.enable
      };
      this.editDialogVisible = true;
    },
    getParentPath(taskPath) {
      if (!taskPath || !taskPath.includes('/')) return 'root'; // 根目录
      return taskPath.substring(0, taskPath.lastIndexOf('/'));
    },
    // 新增方法：刷新父目录
    async refreshParentDirectory(parentPath) {
      try {
        // 获取父目录的最新数据
        const res = await axios.get('http://localhost:8080/api/v2/task/query/task/path', {
          params: { path: parentPath }
        });

        if (res.data.code === 200) {
          // 转换API返回的目录结构
          console.log("api返回的父目录" + parentPath);
          const newChildren = this.transformDirectoryTree(
            [res.data.data],
            parentPath === 'root' ? '' : parentPath
          );
          console.log("1" + newChildren)
          // 在目录树中定位父节点
          const tree = this.$refs.directoryTree;
          const parentNode = this.findNodeByPath(tree, parentPath);

          if (parentNode) {
            // 更新父节点的children
            this.$set(parentNode.data, 'children', newChildren[0].children || []);

            // 刷新树组件并保持展开状态
            tree.updateKeyChildren(parentNode.key, newChildren[0].children || []);
            tree.setCurrentKey(parentNode.key);
            this.$nextTick(() => {
              // 设置当前选中节点为父节点
              tree.setCurrentKey(parentNode.key);

              // 获取节点对象并触发点击事件
              const nodeObj = tree.getNode(parentNode.key);
              if (nodeObj) {
                // 触发节点点击事件，模拟用户点击
                this.selectTaskDirectory(nodeObj.data);
              }
            });
          }
        }
      } catch (error) {
        console.error('刷新父目录失败', error);
      }
    },
    // 新增方法：根据路径查找节点
    findNodeByPath(tree, path) {
      const find = (nodes) => {
        for (const node of nodes) {
          if (node.data.fullPath === path) return node;
          if (node.childNodes && node.childNodes.length > 0) {
            const found = find(node.childNodes);
            if (found) return found;
          }
        }
        return null;
      };

      return find(tree.root.childNodes);
    },
    // 提交编辑
    async submitEdit() {
      try {
        const response = await axios.put(
          'http://localhost:8080/api/v2/task/update/taskElement',
          this.editFormData,
          {
            params: {
              path: this.currentDirectoryPath
            }
          }
        );

        if (response.data.code === 200) {
          this.$message.success('任务更新成功');

          // 更新当前任务数据
          Object.assign(this.currentTask, this.editFormData);
          const taskPath = this.currentTask.komPath || this.currentTask.systemKernelObjectPath;
          const parentPath = taskPath.substring(0, taskPath.lastIndexOf('/'));
          console.log("编辑后的父路径" + parentPath);
          this.newParentPath = parentPath;

          // 刷新父目录
          await this.refreshParentDirectory(parentPath);
          // 更新本地任务列表
          const index = this.allTasks.findIndex(t => t.id === this.currentTask.id);
          if (index !== -1) {
            this.allTasks.splice(index, 1, { ...this.currentTask });
          }
        } else {
          this.$message.error('更新失败: ' + response.data.msg);
        }
      } catch (error) {
        console.error('更新任务失败', error);
        this.$message.error('更新失败: ' + (error.response?.data?.msg || error.message));
      }
    },
    showAddNamespaceDialog(nodeData) {
      // 保存当前点击的节点作为父节点
      this.currentNamespaceNode = nodeData;
      this.newNamespaceForm.name = ''; // 清空输入框
      this.addNamespaceDialogVisible = true; // 激活对话框
    },
    // 右键点击事件[5,6](@ref)
    handleRightClick(event, node) {
      event.preventDefault(); // 阻止默认菜单

      this.contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        node: node
      };

      // 点击页面其他地方关闭菜单
      document.addEventListener('click', this.closeContextMenu);
    },

    // 关闭菜单
    closeContextMenu() {
      this.contextMenu.visible = false;
      document.removeEventListener('click', this.closeContextMenu);
    },
    handleMenuSelect(indexPath) {
      // indexPath格式: "父菜单索引" 或 "父菜单索引-子菜单索引"
      const [parentIndex] = indexPath.split('-');
      this.activeMenuIndex = parseInt(parentIndex);
      if (indexPath === '1-0') { // 任务列表
        this.activeSubMenuIndex = '1-0'
      } else if (indexPath === '1-1') {
        this.activeSubMenuIndex = '1-1'// 运维中心
        this.fetchInstanceData();
      } else if (indexPath === '2') { // 经济事件日历
        // 经济事件日历不需要子菜单
      }
    },
    // 菜单项选择
    handleTreeMenuSelect(command) {
      if (command === 'delete') {
        this.deleteDirectory();
      }
      this.closeContextMenu();
    },

    async deleteDirectory() {
      const nodeData = this.currentSelectedNode;
      if (!nodeData) {
        this.$message.warning('请先选择要删除的目录');
        return;
      }

      try {
        await this.$confirm(`确定删除目录 "${nodeData.label}" 及其所有内容？`, '删除确认', {
          type: 'warning'
        });

        await axios.delete('http://localhost:8080/api/v2/task/remove/task/all/child', {
          params: { path: nodeData.fullPath }
        });

        this.$message.success('目录删除成功');

        const tree = this.$refs.directoryTree;
        const currentNode = tree.getNode(nodeData);

        if (currentNode && currentNode.parent) {
          const parentNode = currentNode.parent;
          await this.refreshSubTree(parentNode.data);

          this.$nextTick(() => {
            // 设置父节点为当前选中
            tree.setCurrentKey(parentNode.data.guid);
            // 手动触发节点点击事件
            this.selectTaskDirectory(parentNode.data);
          });
        } else {
          await this.fetchTaskDirectory();
        }
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除失败: ' + (error.response?.data?.msg || error.message));
        }
      }
    },

    // 添加新命名空间
    async addNewNamespace() {
      if (!this.newNamespaceForm.name.trim()) {
        this.$message.warning('请输入有效的目录名称');
        return;
      }

      try {
        const parentPath = this.currentDirectoryPath;
        const response = await axios.put(
          'http://localhost:8080/api/v2/task/add/task/namespace/child',
          null,
          {
            params: {
              path: this.newNamespaceForm.name,
              parentPath: parentPath
            }
          }
        );

        if (response.data.code === 200) {
          this.$message.success('目录添加成功');
          this.addNamespaceDialogVisible = false;

          // 1. 保存当前展开状态
          const currentExpandedKeys = [...this.expandedKeys];

          // 2. 刷新当前节点（父节点）
          await this.refreshSubTree(this.currentNamespaceNode);

          // 3. 确保当前节点保持展开状态
          if (!this.expandedKeys.includes(this.currentNamespaceNode.guid)) {
            this.expandedKeys.push(this.currentNamespaceNode.guid);
          }

          // 4. 恢复其他节点的展开状态
          this.$nextTick(() => {
            // 恢复之前展开的所有节点
            this.expandedKeys = [...new Set([...currentExpandedKeys, ...this.expandedKeys])];

            // 高亮当前节点
            this.$refs.directoryTree.setCurrentKey(this.currentNamespaceNode.guid);
          });
        } else {
          this.$message.error(`添加失败: ${response.data.msg}`);
        }
      } catch (error) {
        console.error('添加目录失败', error);
        this.$message.error('添加目录失败: ' + (error.response?.data?.msg || error.message));
      }
    },
    // 获取任务目录结构
    async fetchTaskDirectory() {
      try {
        const response = await axios.get('http://localhost:8080/api/v2/task/query/task/path', {
          params: { path: 'root' }
        });

        if (response.data.code === 200 && response.data.data) {
          // 确保数据结构正确
          const data = response.data.data;
          this.taskDirectory = this.transformDirectoryTree([data]);
        } else {
          throw new Error('无效的响应数据或code不匹配');
        }
      } catch (error) {
        console.warn('获取任务目录失败，使用模拟数据:', error);
        // 使用更完整的模拟数据
        this.taskDirectory = [{
          guid: 'task-root',
          label: '任务目录',
          type: 'Namespace',
          fullPath: 'root',
          taskCount: 0,
          icon: 'el-icon-folder',
          children: [
            {
              guid: 'job-1',
              label: '示例任务组',
              type: 'JobElement',
              fullPath: 'root/示例任务组',
              taskCount: 2,
              icon: 'el-icon-folder',
              children: [
                {
                  guid: 'task-1',
                  label: '示例任务1',
                  type: 'TaskElement',
                  fullPath: 'root/示例任务组/示例任务1',
                  icon: 'el-icon-tickets'
                },
                {
                  guid: 'task-2',
                  label: '示例任务2',
                  type: 'TaskElement',
                  fullPath: 'root/示例任务组/示例任务2',
                  icon: 'el-icon-tickets'
                }
              ]
            }
          ]
        }];
      }
    },

    /*     // 转换目录树结构
    // 转换目录树结构
    transformDirectoryTree(nodes, parentPath = '') {
      return nodes.map(node => {
        // 计算当前节点的完整路径
        const isRoot = !parentPath; // 判断是否是根节点
        const nodeName = node.name || node.rootName;
        const fullPath = isRoot ? nodeName : `${parentPath}/${nodeName}`;
        
        return {
          guid: node.guid,
          label: nodeName,
          type: node.type,
          fullPath, // 存储完整路径
          taskCount: node.children ? node.children.filter(child => child.type === 'TaskElement').length : 0,
          icon: node.type === 'Namespace' ? 'el-icon-folder' : 'el-icon-tickets',
          children: node.children ? this.transformDirectoryTree(node.children, fullPath) : []
        };
      });
    }, */
    // 转换目录树结构（更新版）
    transformDirectoryTree(nodes, parentPath = '') {
      if (!nodes) return [];
      console.log('转换目录树结构', nodes);
      console.log('转换目录树结构', parentPath);
      return nodes.map(node => {
        /* const isRoot = !parentPath; */
        const nodeName = node.name || node.rootName;
        const basePath = parentPath.endsWith(`/${nodeName}`)
          ? parentPath
          : (parentPath ? `${parentPath}/${nodeName}` : nodeName);
        const fullPath = basePath;

        return {
          guid: node.guid,
          label: nodeName,
          type: node.type || node.metaType,
          fullPath: fullPath,
          taskCount: node.children ? node.children.filter(child =>
            child.type === 'TaskElement' || child.metaType === 'TaskElement').length : 0,
          icon: (node.type === 'Namespace' || node.metaType === 'Namespace')
            ? 'el-icon-folder' : 'el-icon-tickets',
          children: node.children ? this.transformDirectoryTree(node.children, fullPath) : []
        };
      });
    },
    // 当选择目录树节点时
    async selectTaskDirectory(data) {
      if ((data.type === 'Namespace' || data.type === 'JobElement') && data.children) {
        console.log('选择目录', data);
        this.currentDirectoryId = data.guid;
        this.currentDirectoryPath = data.fullPath;
        this.currentSelectedNode = data;
        // 获取该命名空间下的所有任务
        try {
          const taskElements = data.children.filter(child => child.type === 'TaskElement');
          const tasks = await Promise.all(
            taskElements.map(item => this.fetchTaskDetails(item.guid))
          );
          this.allTasks = tasks.filter(task => task !== null);
        } catch (error) {
          console.error('获取任务列表失败', error);
          this.$message.error('获取任务列表失败: ' + error.message);
        }
      }
      else if (data.type === 'TaskElement') {
        console.log('选择任务', data);
        this.currentDirectoryId = null;
        this.currentDirectoryPath = data.fullPath;

        try {
          const task = await this.fetchTaskDetails(data.guid);
          if (task) {
            this.currentTask = task;
          }
        } catch (error) {
          console.error('获取任务详情失败', error);
          this.$message.error('获取任务详情失败: ' + error.message);
        }
      }
    },
    backToTaskList() {
      this.currentTask = null;
      this.currentDirectoryId = this.currentSelectedNode?.guid || null;
    },

    async fetchTaskDetails(guid) {
      try {
        const response = await axios.get('http://localhost:8080/api/v2/task/query/guid/info', {
          params: { guid }
        });

        if (response.data.code === 200) {
          const taskData = response.data.data;
          return {
            ...this.transformTaskData(taskData),
            // 保留原始数据字段
            ...taskData, // 直接扩展所有原始字段
            // 特别保留的重要字段
            priority: taskData.priority,
            type: taskData.type,
            imagePath: taskData.imagePath,
            enable: taskData.enable,
            deploymentMethod: taskData.deploymentMethod,
            scheduleTypeCode: taskData.scheduleTypeCode,
            scheduleCycleCode: taskData.scheduleCycleCode,
            dryRun: taskData.dryRun,
            resourceType: taskData.resourceType,
            scheduleType: taskData.scheduleType,
            scheduleCycle: taskData.scheduleCycle,
            actuallyPriority: taskData.actuallyPriority,
            extraMeta: taskData.extraMeta,
            createTime: taskData.createTime,
            updateTime: taskData.updateTime,
            enumId: taskData.enumId,
            guid: taskData.guid,
            systemKernelObjectPath: taskData.systemKernelObjectPath,
            distributedTreeNode: taskData.distributedTreeNode,
            metaGuid: taskData.metaGuid,
            komPath: taskData.komPath,
            name: taskData.name,
            id: taskData.id,
            description: taskData.description,
            marshallingArchitecture: taskData.marshallingArchitecture,
            extraInformation: taskData.extraInformation,
            scenario: taskData.scenario,
            metaType: taskData.metaType
          };
        }
      } catch (error) {
        console.error('获取任务详情失败', error);
        this.$message.error('获取任务详情失败: ' + error.message);
        return null;
      }
    },
    // 局部刷新子树
    async refreshSubTree(parentNode) {
      try {

        const response = await axios.get('http://localhost:8080/api/v2/task/query/task/path', {
          params: { path: parentNode.fullPath || parentNode.path }
        });

        if (response.data.code === 200) {
          // 转换API返回的目录结构为前端所需格式
          console.log("3" + parentNode.fullPath);
          const newChildren = this.transformDirectoryTree(response.data.data.children, parentNode.fullPath);

          // 更新树节点
          const node = this.$refs.directoryTree.getNode(parentNode);
          if (node) {
            // 更新节点的children
            this.$set(node.data, 'children', newChildren);

            // 调用Tree组件的updateKeyChildren方法
            this.$refs.directoryTree.updateKeyChildren(parentNode.guid, newChildren);
          }
        }
      } catch (error) {
        console.error('刷新子树失败', error);
        this.$message.error('刷新子树失败: ' + error.message);
      }
    },

    // 转换任务数据格式
    transformTaskData(taskData) {
      // 转换状态
      const statuses = ['waiting', 'running', 'success', 'error'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      // 转换优先级
      const priorityText = taskData.priority >= 8 ? 'High' :
        taskData.priority >= 4 ? 'Medium' : 'Low';

      return {
        id: taskData.guid,
        name: taskData.name,
        path: taskData.komPath || taskData.systemKernelObjectPath || '',
        directoryId: this.currentDirectoryId,
        icon: this.getTaskIcon(taskData.type),
        status: randomStatus,
        priority: priorityText,
        progress: Math.floor(Math.random() * 100),
        lastRun: taskData.updateTime ? new Date(taskData.updateTime).toLocaleString() : '未执行',
        nextRun: '待定',
        interval: taskData.scheduleType || '手动执行',
        description: taskData.description || '无描述信息',
        enable: taskData.enable,  // 映射启用状态
        scheduleType: taskData.scheduleType, // 映射调度类型
        // 保留原始数据用于详情展示
        rawData: taskData
      };
    },

    /*     // 当选择目录树节点时
        async selectTaskDirectory(data) {
          if (!data.children) {
            this.currentDirectoryId = data.id;
            
            // 获取该目录下的任务
            try {
              const response = await axios.get('http://localhost:8080/api/v2/task/query/guid/info', {
                params: { guid: data.guid }
              });
              
              if (response.data.code === 200) {
                if (Array.isArray(response.data.data)) {
                  // 命名空间节点，包含多个子任务
                  const tasks = await Promise.all(
                    response.data.data
                      .filter(item => item.metaType === 'TaskElement')
                      .map(item => this.fetchTaskDetails(item.guid))
                  );
                  
                  this.allTasks = tasks.filter(task => task !== null);
                } else {
                  // 单个任务节点
                  const task = await this.fetchTaskDetails(response.data.data.guid);
                  if (task) {
                    this.allTasks = [task];
                  }
                }
              }
            } catch (error) {
              console.error('获取任务列表失败', error);
              this.$message.error('获取任务列表失败: ' + error.message);
            }
          }
        }, */

    // 创建新任务
    // 修改后的 submitNewTask 方法
    async submitNewTask() {
      this.$refs.taskForm.validate(async (valid) => {
        if (valid) {
          try {
            // 获取当前目录路径作为父路径
            console.log('当前目录路径：', this.currentDirectoryPath);
            const parentPath = this.currentDirectoryPath || 'root';
            const parentPath1 = 'root';
            const requestData = {
              ...this.addTaskData,
              parentPath
            };

            const response = await axios.put(
              'http://localhost:8080/api/v2/task/add/task/child',
              requestData
            );

            if (response.data.code === 200) {
              const guid = response.data.data;
              const newTask = this.createTaskFromFormData(guid);

              // 添加到任务列表
              this.allTasks.push(newTask);

              // 关键修改：只刷新父目录而非整个目录树
              await this.refreshParentDirectory(parentPath1);

              this.$message.success('任务创建成功');
              this.createDialogVisible = false;
            } else {
              this.$message.error('任务创建失败: ' + response.data.msg);
            }
          } catch (error) {
            console.error('创建任务失败', error);
            this.$message.error('任务创建失败: ' + (error.response?.data?.msg || error.message));
          }
        } else {
          this.$message.error('请填写必填字段');
          return false;
        }
      });
    },

    // 查看任务详情
    async viewTaskDetails(task) {
      this.detailDialogVisible = true;
      this.currentTask = task;

      // 如果已有原始数据，直接使用
      if (task.rawData) {
        this.currentTaskDetail = task.rawData;
        return;
      }

      // 否则从API获取
      try {
        const response = await axios.get('http://localhost:8080/api/v2/task/query/guid/info', {
          params: { guid: task.id }
        });

        if (response.data.code === 200) {
          this.currentTaskDetail = response.data.data;
        }
      } catch (error) {
        console.error('获取任务详情失败', error);
        this.$message.error('获取任务详情失败: ' + error.message);
      }
    },
    switchView(viewType) {
      this.currentView = viewType;
    },
    tableRowClassName({ row }) {
      return `status-${row.status}`;
    },
    getProgressStatus(status) {
      if (status === 'error') return 'exception';
      if (status === 'success') return 'success';
      return '';
    },
    getTaskColor(status) {
      const colors = {
        running: '#409EFF',
        waiting: '#909399',
        success: '#67C23A',
        error: '#F56C6C'
      };
      return colors[status] || '#909399';
    },
    createTaskFromFormData(guid) {
      return {
        id: guid,
        name: this.addTaskData.name,
        type: this.addTaskData.taskType,
        resource: this.addTaskData.resourceType,
        schedule: this.addTaskData.kernelScheduleCycle,
        priority: this.getPriorityText(this.addTaskData.priority),
        status: 'waiting',
        icon: this.getTaskIcon(this.addTaskData.taskType),
        description: this.generateTaskDescription(),
        path: this.currentDirectoryName ? `/${this.currentDirectoryName}` : '/未分类',
        lastRun: null,
        nextRun: this.calculateNextRun(),
        directoryId: this.currentDirectoryId || 0,
        interval: this.getScheduleText(this.addTaskData.kernelScheduleCycle)
      };
    },
    getPriorityText(priority) {
      if (priority >= 8) return 'High';
      if (priority >= 4) return 'Medium';
      return 'Low';
    },
    getTaskIcon(taskType) {
      const iconMap = {
        data_processing: 'el-icon-s-operation',
        model_training: 'el-icon-cpu',
        realtime_inference: 'el-icon-s-promotion',
        batch_job: 'el-icon-s-fold',
        monitoring: 'el-icon-monitor'
      };
      return iconMap[taskType] || 'el-icon-help';
    },
    generateTaskDescription() {
      const scheduleText = this.getScheduleText(this.addTaskData.kernelScheduleCycle);
      const typeText = this.getTaskTypeLabel(this.addTaskData.taskType);
      return `${this.addTaskData.name}任务（类型：${typeText}，调度：${scheduleText}）`;
    },
    getTaskTypeLabel(taskType) {
      const type = this.taskTypeOptions.find(t => t.value === taskType);
      return type ? type.label : taskType;
    },
    getScheduleText(cycle) {
      const cycleMap = {
        Minute: '每分钟',
        Hour: '每小时',
        Day: '每天',
        Week: '每周',
        Month: '每月',
        Undefined: '手动执行'
      };
      return cycleMap[cycle] || cycle;
    },
    calculateNextRun() {
      const now = new Date();

      switch (this.addTaskData.kernelScheduleCycle) {
        case 'Minute':
          now.setMinutes(now.getMinutes() + 1);
          break;
        case 'Hour':
          now.setHours(now.getHours() + 1);
          break;
        case 'Day':
          now.setDate(now.getDate() + 1);
          break;
        case 'Week':
          now.setDate(now.getDate() + 7);
          break;
        case 'Month':
          now.setMonth(now.getMonth() + 1);
          break;
      }

      return now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    async addTask(taskData) {
      try {
        const response = await axios.post('http://localhost:8080/api/v2/task/add/task', taskData);

        if (response.status === 200 && response.data.code === 200) {
          return response.data.data;
        } else {
          const errorMsg = response.data.msg || `请求失败，状态码：${response.status}`;
          throw new Error(errorMsg);
        }
      } catch (error) {
        console.error('创建任务时出错:', error);
        let errorMessage = '创建任务时发生错误';

        if (error.response && error.response.data) {
          errorMessage = error.response.data.msg || error.response.data.message || error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        const statusError = new Error(errorMessage);
        statusError.statusCode = error.response ? error.response.status : null;
        throw statusError;
      }
    },
    async queryTaskDetail(guid) {
      try {
        const response = await axios.get('http://localhost:8080/api/v2/task/query/task/guid', {
          params: { guid }
        });

        if (response.status === 200 && response.data.code === 200) {
          return response.data.data;
        } else {
          const errorMsg = response.data.msg || `请求失败，状态码：${response.status}`;
          throw new Error(errorMsg);
        }
      } catch (error) {
        console.error('查询任务详情时出错:', error);
        let errorMessage = '查询任务详情时发生错误';
        if (error.response && error.response.data) {
          errorMessage = error.response.data.msg || error.response.data.message || error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        throw new Error(errorMessage);
      }
    },
    getColumnTasks(column) {
      if (this.filteredTasks.length === 0) return [];

      const midPoint = Math.ceil(this.filteredTasks.length / 2);

      if (column === 1) {
        return this.filteredTasks.slice(0, midPoint);
      } else {
        return this.filteredTasks.slice(midPoint);
      }
    },
    selectMenu(index) {
      this.activeMenuIndex = index;
      if (index !== 1) {
        this.currentDirectoryId = null;
      }
    },
    getDirectoryColor(id) {
      const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'];
      return colors[id % colors.length];
    },
    filterDirectoryNode(value, data) {
      if (!value) return true;
      return data.label.toLowerCase().includes(value.toLowerCase());
    },
    // 在methods中添加
    getStatusText(status) {
      const statusMap = {
        'RUNNING': '运行中',
        'FINISHED': '已完成',
        'Finished': '已完成', // 新增映射
        'WAITING': '等待中',
        'ERROR': '异常',
        'STOPPED': '已停止'
      };
      return statusMap[status.toUpperCase()] || status;
    },
    createTask() {
      this.createDialogVisible = true;
    },
    async startTask(task) {
      try {
        const taskPath = task.systemKernelObjectPath || task.komPath;
        if (!taskPath) {
          this.$message.warning('无法获取任务路径');
          return;
        }

        const response = await axios.put('http://localhost:8080/api/v2/task/start/task/path', null, {
          params: { path: taskPath }
        });

        if (response.data.code === 200) {
          this.$message.success('任务实例已启动');
          task.status = 'running';
          task.progress = 10;
        } else {
          this.$message.error(`启动失败: ${response.data.msg}`);
        }
      } catch (error) {
        console.error('启动任务实例失败', error);
        this.$message.error('启动失败: ' + (error.response?.data?.msg || error.message));
      }
    },
    stopTask(task) {
      this.$message.info(`停止任务: ${task.name}`);
      task.status = 'waiting';
    },
    viewTaskLog(task) {
      this.$message.info(`查看任务日志: ${task.name}`);
    },
    editTask(task) {
      this.$message.info(`编辑任务: ${task.name}`);
    },
    async deleteTask(task) {
      try {
        await this.$confirm(`确定删除任务 "${task.name}"？`, '删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        // 先获取并存储父路径（关键修改点）
        const taskPath = task.fullPath || task.komPath || task.systemKernelObjectPath;
        const parentPath = this.getParentPath(taskPath);

        if (!taskPath) {
          this.$message.error('无法获取任务路径');
          return;
        }

        // 调用删除API
        await axios.delete(
          'http://localhost:8080/api/v2/task/remove/task/all/child',
          { params: { path: taskPath } }
        );

        this.$message.success('任务删除成功');

        // 使用编辑任务相同的刷新机制（关键修改点）
        if (parentPath) {
          await this.refreshParentDirectory(parentPath);
        } else {
          await this.fetchTaskDirectory();
        }

        // 关闭详情视图（如果当前查看的是被删除任务）
        if (this.currentTask && this.currentTask.id === task.id) {
          this.currentTask = null;
        }

        // 从本地任务列表中移除
        this.allTasks = this.allTasks.filter(t => t.id !== task.id);

      } catch (error) {
        if (error === 'cancel') return;

        console.error('删除任务失败', error);

        let errorMessage = '删除失败';
        if (error.response) {
          switch (error.response.status) {
            case 404:
              errorMessage = '任务不存在或已被删除';
              break;
            case 403:
              errorMessage = '无权删除此任务';
              break;
            default:
              errorMessage = `服务器错误 (${error.response.status})`;
          }
        } else if (error.request) {
          errorMessage = '网络请求失败，请检查连接';
        }

        this.$message.error(errorMessage);
      }
    },
    refreshDirectory() {
      this.$message.success('目录已刷新');
    },
    resetTaskForm() {
      this.$refs.taskForm.resetFields();
    },
    formatDateTime(dateString) {
      if (!dateString) return '无记录';

      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },
    typeText(type) {
      const typeMap = {
        data_processing: '数据处理',
        model_training: '模型训练',
        realtime_inference: '实时推理',
        batch_job: '批量作业',
        monitoring: '监控任务'
      };
      return typeMap[type] || type;
    },
    resourceTypeText(type) {
      const typeMap = {
        cpu: 'CPU密集型',
        memory: '内存密集型',
        gpu: 'GPU加速'
      };
      return typeMap[type] || type;
    },
    scheduleTypeText(type) {
      const typeMap = {
        Manual: '手动执行',
        Triggered: '触发执行',
        Resident: '常驻执行',
        Cycle: '周期执行',
        Undefined: '未定义'
      };
      return typeMap[type] || type;
    },
    scheduleCycleText(cycle) {
      const cycleMap = {
        Minute: '每分钟',
        Hour: '每小时',
        Day: '每天',
        Week: '每周',
        Month: '每月',
        Undefined: '未定义'
      };
      return cycleMap[cycle] || cycle;
    },
    taskStatusColor(status) {
      const colors = {
        running: '#409EFF',
        waiting: '#909399',
        success: '#67C23A',
        error: '#F56C6C'
      };
      return colors[status] || '#909399';
    },
    getFolderIconClass(node, data) {
      if (data.type === 'Namespace') {
        // 根据节点展开状态应用不同图标
        return node.expanded ? 'task-folder-open' : 'task-folder';
      } else if (data.type === 'JobElement') {
        return 'task-item-job';
      }
      else
        return 'task-item';
    },
    async deleteInstance(row) {
      try {
        // 1. 二次确认（避免误操作）
        await this.$confirm('确定删除该实例吗？', '警告', {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        });

        // 2. 调用后端API
        const response = await axios.delete('http://localhost:8080/api/v2/task/instance/delete/task/instance', {
          params: { guid: row.guid } // 传递实例GUID
        });

        // 3. 处理响应结果
        if (response.data && response.data.code === 200) {
          this.$message.success('删除成功');

          // 4. 更新UI：从列表中移除已删除项
          const index = this.instanceList.findIndex(item => item.guid === row.guid);
          if (index !== -1) {
            this.instanceList.splice(index, 1);
          }

          // 5. 刷新分页数据（避免页码溢出）
          this.instancePagination.total--;
        } else {
          throw new Error(response.data?.msg || '删除失败');
        }
      } catch (error) {
        // 6. 统一错误处理
        if (error !== 'cancel') { // 忽略用户取消操作
          console.error('删除失败:', error);
          this.$message.error(`删除失败: ${error.message}`);
        }
      }
    }
  },
  watch: {
    directoryFilter(val) {
      this.$refs.directoryTree.filter(val);
    },
    currentTask: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          // 当前任务变化时更新编辑表单
          this.updateEditForm(newVal);
        }
      }
    }
  },
  mounted() {
    this.fetchTaskDirectory();
    setInterval(() => {
      this.systemResources.cpu = Math.min(100, Math.max(5, this.systemResources.cpu + (Math.random() * 10 - 5)));
      this.systemResources.memory = Math.min(100, Math.max(5, this.systemResources.memory + (Math.random() * 8 - 4)));
    }, 3000);
  }
};
</script>

<style scoped>
/* 紧凑表单全局样式 - 响应式优化 */
.compact-form {
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* 确保最小高度撑满视口 */
}

.section-title {
  margin: 0 0 12px 0;
  font-size: clamp(13px, 3vw, 14px);
  /* 使用clamp函数确保字体自适应 */
  font-weight: 600;
  color: #409EFF;
  display: flex;
  align-items: center;
}

.section-title i {
  margin-right: 8px;
  font-size: clamp(14px, 3.5vw, 16px);
  /* 响应式图标大小 */
}

/* 紧凑表单项 */
.compact-item {
  margin-bottom: 12px !important;
}

/* 开关控件垂直居中 */
.switch-item .el-form-item__content {
  line-height: 32px;
}

/* 响应式文本域 - 核心优化 */
.task-description-textarea {
  min-height: 80px !important;
  /* 减小最小高度 */
  max-height: 30vh !important;
  /* 使用视口单位确保自适应 */
  padding: 8px 10px !important;
  font-size: 13px;
  resize: vertical;
  /* 允许用户手动调整 */
  overflow-y: auto;
  /* 确保内容可滚动 */
}

/* 紧凑额外信息框 */
.compact-pre {
  max-height: 25vh;
  /* 使用视口单位 */
  overflow: auto;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

/* 增强型响应式优化 */
@media (max-width: 992px) {
  .compact-form {
    padding: 10px;
  }

  .el-form-item__label {
    font-size: 12px !important;
    width: 140px !important;
    /* 缩小标签宽度 */
  }

  .section-title {
    margin-bottom: 8px;
  }

  /* 小屏设备单列布局 */
  .el-col {
    width: 100% !important;
    margin-bottom: 5px !important;
  }
}

@media (max-width: 768px) {
  .compact-form {
    padding: 8px;
  }

  .el-form-item__label {
    font-size: 11px !important;
    width: 120px !important;
    padding-right: 5px !important;
  }

  .task-description-textarea {
    min-height: 70px !important;
    max-height: 25vh !important;
  }

  .compact-pre {
    max-height: 20vh;
    font-size: 11px;
  }

  /* 移动设备隐藏非必要元素 */
  .el-form-item__extra {
    display: none;
  }
}

/* 超小屏幕优化（手机竖屏） */
@media (max-width: 480px) {
  .compact-form {
    padding: 6px;
  }

  .el-form-item {
    margin-bottom: 8px !important;
  }

  .task-description-textarea {
    min-height: 60px !important;
    max-height: 20vh !important;
    font-size: 12px;
  }

  .compact-pre {
    padding: 6px;
  }

  /* 垂直堆叠表单标签 */
  .el-form-item__content {
    margin-left: 0 !important;
    width: 100% !important;
  }

  .el-form-item__label {
    width: 100% !important;
    text-align: left !important;
    margin-bottom: 4px;
    line-height: 1.3 !important;
  }
}

/* 实例详情视图 */

.instance-detail-view {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
}

/* 内容容器 - 可滚动区域 */
.instance-detail-container {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 70px;
  /* 为底部按钮预留空间 */
}

/* 固定定位的操作按钮 */
.view-actions-fixed {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .view-actions-fixed {
    flex-direction: column;
    padding: 10px;
  }

  .view-actions-fixed .el-button {
    width: 100%;
    margin: 5px 0;
  }
}

.view-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.view-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

.view-header h2 i {
  margin-right: 10px;
  color: #409EFF;
}

.back-button {
  margin-right: 20px;
  padding: 8px 15px;
  border-radius: 4px;
  background: #f5f7fa;
  transition: all 0.3s;
}

.back-button:hover {
  background: #ecf5ff;
  color: #409EFF;
}

/* 卡片样式 */
.card-style {
  border-left: 4px solid #409EFF;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 6px;
  background: #f9fafc;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.error-card {
  border-left: 4px solid #F56C6C;
}

/* 区域头部样式 */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.section-header i {
  margin-right: 8px;
  font-size: 18px;
  color: #409EFF;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 详情项样式 */
.detail-item {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  line-height: 1.6;
}

.detail-item label {
  width: 100px;
  color: #606266;
  flex-shrink: 0;
  font-weight: 500;
}

/* 特殊文本样式 */
.highlight-text {
  font-weight: 600;
  color: #303133;
}

.highlight-number {
  font-weight: 600;
  color: #409EFF;
}

.time-value {
  font-family: monospace;
  color: #606266;
}

.path-value {
  word-break: break-all;
  color: #303133;
}

.guid-value {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  color: #909399;
}

/* 错误信息卡片 */
.error-container {
  background: #fef0f0;
  border-radius: 4px;
  padding: 15px;
}

.error-pre {
  color: #F56C6C;
  font-family: monospace;
  white-space: pre-wrap;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

/* 操作按钮区域 */
.view-actions {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .detail-item label {
    width: 85px;
  }
}

@media (max-width: 768px) {
  .el-col {
    width: 100% !important;
    margin-bottom: 10px;
  }
}

/* 操作按钮容器 */
.action-container {
  display: flex;
  justify-content: space-around;
}

/* 表格样式增强 */
.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-table::before {
  height: 0;
}

/* 分页样式 */
.el-pagination {
  padding: 10px 0;
  background: #fff;
  border-radius: 0 0 8px 8px;
}

/* 任务描述区域样式 */
.detail-section {
  margin-bottom: 16px;
}

/* 任务描述区域优化 */
.task-description-form-item {
  margin-bottom: 20px;
}

.task-description-textarea {
  width: 100%;
  min-height: 150px;
  /* 确保最小高度足够 */
  max-height: 400px;
  /* 限制最大高度 */
  border-radius: 6px;
  border: 1px solid #ebeef5;
  transition: border-color 0.3s;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  /* 允许垂直调整大小 */
  box-sizing: border-box;
  /* 防止边框影响尺寸 */
}

.task-description-textarea:hover {
  border-color: #409EFF;
}

.task-description-textarea:focus {
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 滚动容器优化 */
.scrollable-form ::v-deep .el-scrollbar__wrap {
  padding-bottom: 30px;
  overflow-x: hidden;
  /* 防止横向滚动条 */
}

.scrollable-form ::v-deep .el-scrollbar__view {
  min-height: 100%;
  padding-right: 10px;
  /* 避免内容被滚动条遮挡 */
}

/* 响应式调整 */
@media (max-width: 992px) {
  .task-description-textarea {
    min-height: 120px;
    padding: 12px;
  }
}

.instance-detail-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 确保容器撑满 */
  overflow-y: auto;
  /* 内容区域独立滚动 */
}

.view-actions {
  margin-top: auto;
  /* 按钮区域自动置底 */
  padding: 15px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.card-style {
  border-left: 4px solid #409EFF;
}

.error-card {
  border-left: 4px solid #F56C6C;
}

/* 区域头部样式 */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.section-header i {
  margin-right: 8px;
  font-size: 18px;
  color: #409EFF;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 详情项样式 */
.detail-item {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  line-height: 1.6;
}

.detail-item label {
  width: 100px;
  color: #606266;
  flex-shrink: 0;
  font-weight: 500;
}

/* 特殊文本样式 */
.highlight-text {
  font-weight: 600;
  color: #303133;
}

.highlight-number {
  font-weight: 600;
  color: #409EFF;
}

.time-value {
  font-family: monospace;
  color: #606266;
}

.path-value {
  word-break: break-all;
  color: #303133;
}

.guid-value {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  color: #909399;
}

/* 错误信息卡片 */
.error-container {
  background: #fef0f0;
  border-radius: 4px;
  padding: 15px;
}

.error-pre {
  color: #F56C6C;
  font-family: monospace;
  white-space: pre-wrap;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

/* 对话框底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px 20px;
  border-top: 1px solid #ebeef5;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .detail-item label {
    width: 85px;
  }
}

@media (max-width: 992px) {
  .el-dialog {
    width: 70% !important;
  }
}

@media (max-width: 768px) {
  .el-dialog {
    width: 90% !important;
  }

  .el-col {
    width: 100% !important;
    margin-bottom: 10px;
  }
}

.guid-value {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.error-container {
  background: #fef0f0;
  border-radius: 4px;
  padding: 15px;
  border-left: 3px solid #F56C6C;
}

.error-pre {
  color: #F56C6C;
  font-family: monospace;
  white-space: pre-wrap;
  margin: 0;
}

.action-container {
  display: flex;
  justify-content: space-around;
  /* 或 space-between */
  width: 100%;
}

.action-container .el-button {
  flex: 1;
  /* 按钮均分容器宽度 */
  margin: 0 5px;
  /* 按钮间距 */
}

.detail-main-layout {
  display: flex;
  gap: 15px;
  width: 100%;
  height: 100%;
}

/* 右侧垂直按钮区域 */
.detail-actions-vertical {
  flex: 0 0 5%;
  /* 占据10%宽度 */
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  /* 顶部对齐 */
  gap: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 100%;
}

/* 按钮组样式 */
.detail-actions-vertical .button-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* 缩小间距 */
  align-items: center;
  /* 居中对齐 */
}

/* 紧凑图标按钮样式 */
.detail-actions-vertical .compact-icon {
  width: 36px;
  /* 缩小宽度 */
  height: 36px;
  /* 缩小高度 */
  padding: 6px;
  /* 减小内边距 */
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-actions-vertical .el-button+.el-button {
  margin-top: 8px;
  /* 垂直间距代替水平间距 */
  margin-left: 0 !important;
}

/* 响应式适配 */
@media (max-width: 992px) {
  .detail-main-layout {
    flex-direction: column;
  }

  .detail-actions-vertical {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .detail-actions-vertical .button-group {
    flex: 1;
    min-width: 180px;
    /* 缩小最小宽度 */
  }
}

@media (max-width: 576px) {
  .detail-actions-vertical .button-group {
    min-width: 100%;
  }

  .detail-actions-vertical .compact-icon {
    padding: 4px;
    width: 32px;
    height: 32px;
  }
}


/* 自定义滚动条样式 */
.task-detail-container {
  flex: 0 0 90%;
  /* 占据90%宽度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scrollable-form {
  flex: 1;
  max-height: 70vh;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 新增 */
}

::v-deep .el-scrollbar {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 新增 */
}

::v-deep .el-scrollbar__wrap {
  flex: 1;
  max-height: 100% !important;
  overflow-x: hidden !important;
  /* 隐藏横向滚动 */
  overflow-y: auto;
  /* 启用纵向滚动 */
}

::v-deep .el-scrollbar__view {
  min-height: 100%;
  max-width: 100%;
  /* 防止内容溢出 */
  box-sizing: border-box;
}

.main-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 确保运维中心视图占满空间 */
.instance-table {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.task-detail-container {
  width: 85%;
  max-width: 1200px;
  margin: 0 auto;
}

.task-name-cell {
  display: flex;
  align-items: center;
}

.editable-form {
  padding: 20px;
  background: #f9fafc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.form-columns {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-column {
  flex: 1;
  min-width: 0;
}

/* 响应式布局 */
@media (max-width: 992px) {
  .form-columns {
    flex-direction: column;
    gap: 10px;
  }
}

.detail-actions {
  position: sticky;
  bottom: 0;
  width: 90%;
  /* 缩小宽度为父容器的90% */
  max-width: 800px;
  /* 限制最大宽度 */
  margin: 0 auto;
  /* 水平居中 */
  background: white;
  z-index: 10;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  padding: 15px;
  border-radius: 8px;
  /* 可选：添加圆角提升视觉效果 */
}

/* 详情头部样式 */
.detail-header {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  background: #f5f7fa;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #ebeef5;
}

.task-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  background: rgba(64, 158, 255, 0.1);
}

.task-icon i {
  font-size: 24px;
  color: #409EFF;
}

.task-title {
  flex: 1;
}

.task-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.task-id {
  font-size: 13px;
  color: #909399;
}

.task-status {
  padding-right: 15px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.running .status-badge {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.waiting .status-badge {
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
}

.success .status-badge {
  background: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.error .status-badge {
  background: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}

/* 按钮区域样式 */


.button-group {
  display: flex;
  gap: 10px;
}

/* 响应式按钮 */
@media (max-width: 768px) {
  .detail-actions {
    flex-direction: column;
  }

  .button-group {
    width: 100%;
  }

  .button-group .el-button {
    flex: 1;
  }
}

/* 响应式按钮容器 *

/* 响应式按钮基础样式 */
.responsive-button {
  padding: 10px 15px;
  /* 适当的内边距 */
  font-size: 14px;
  /* 基础字体大小 */
  white-space: nowrap;
  /* 防止文字换行 */
  transition: all 0.3s ease;
  /* 平滑过渡效果 */
}

/* 小屏幕适配（宽度≤768px） */
@media (max-width: 768px) {
  .detail-actions {
    flex-direction: column;
    /* 垂直排列 */
    align-items: stretch;
    /* 拉伸填充宽度 */
  }

  .responsive-button {
    width: 100%;
    /* 全宽按钮 */
    margin-bottom: 8px;
    /* 按钮间距 */
    padding: 12px;
    /* 增加点击区域 */
    font-size: 15px;
    /* 稍大字体 */
  }
}

/* 中等屏幕适配（769px-992px） */
@media (min-width: 769px) and (max-width: 992px) {
  .responsive-button {
    min-width: 120px;
    /* 最小宽度 */
    padding: 10px 12px;
    /* 紧凑内边距 */
    font-size: 13px;
    /* 稍小字体 */
  }
}

/* 超小屏幕（宽度≤480px） */
@media (max-width: 480px) {
  .responsive-button {
    padding: 14px;
    /* 更大的点击区域 */
    font-size: 16px;
    /* 更大的字体 */
  }

  /* 图标按钮适配 */
  .responsive-button .el-icon {
    margin-right: 5px;
    /* 图标与文字间距 */
  }
}

.context-menu {
  position: fixed;
  z-index: 9999;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  background: #fff;
}

.el-menu-vertical-demo {
  border-right: none;
}

.el-menu-item {
  height: 36px;
  line-height: 36px;
  font-size: 13px;
}

.el-menu-item:hover {
  background-color: #ecf5ff;
  color: #66b1ff;
}

/* 完整的样式代码 */
/* 文件夹图标（闭合状态） */
.task-folder::before {
  content: "";
  display: inline-block;
  width: 22px;
  height: 22px;
  background: url('~@/assets/icons8-task-48.png') center/contain no-repeat;
  vertical-align: middle;
}

/* 文件夹图标（展开状态） */
.task-folder-open::before {
  content: "";
  display: inline-block;
  width: 22px;
  height: 22px;
  background: url('~@/assets/icons8-task-48.png') center/contain no-repeat;
  vertical-align: middle;
}


.task-item-job::before {
  content: "";
  display: inline-block;
  width: 22px;
  height: 22px;
  background: url('~@/assets/icons8-task-64.png') center/contain no-repeat;
  vertical-align: middle;
}

/* 任务项图标 */
.task-item::before {
  content: "";
  display: inline-block;
  width: 20px;
  height: 20px;
  background: url('~@/assets/icons8-task-50.png') center/contain no-repeat;
  vertical-align: middle;
}

/* 隐藏Element UI默认图标 */
/* 隐藏Element UI默认图标 */
.el-tree-node__expand-icon {
  display: none;
}

/* 文件夹图标（闭合状态） */
.task-folder::before {
  content: "";
  display: inline-block;
  width: 22px;
  height: 22px;
  background: url('~@/assets/icons8-task-48.png') center/contain no-repeat;
  vertical-align: middle;
  margin-right: 8px;
}

/* 文件夹图标（展开状态） */
.task-folder-open::before {
  content: "";
  display: inline-block;
  width: 22px;
  height: 22px;
  background: url('~@/assets/icons8-task-48.png') center/contain no-repeat;
  vertical-align: middle;
  margin-right: 8px;
}

/* 任务项图标 */
.task-item::before {
  content: "";
  display: inline-block;
  width: 20px;
  height: 20px;
  background: url('~@/assets/icons8-task-50.png') center/contain no-repeat;
  vertical-align: middle;
  margin-right: 10px;
}

.task-scheduler {
  display: flex;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden;
  background: #f5f7fa;
}

.sidebar {
  width: 220px;
  background: #304156;
  color: #e4e7ed;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 15px rgba(0, 0, 0, 0.08);
  z-index: 10;
  transition: width 0.3s;
}

.logo {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  padding: 20px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo i {
  font-size: 22px;
  margin-right: 10px;
  color: #409EFF;
}

.menu {
  list-style: none;
  padding: 15px 0;
  flex: 1;
}

.menu li {
  padding: 14px 25px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  margin: 5px 0;
  border-radius: 0 30px 30px 0;
}

.menu li i {
  margin-right: 12px;
  font-size: 18px;
  width: 20px;
  text-align: center;
}

.menu li span {
  flex: 1;
}

.menu li:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu li.active {
  background: #409EFF;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.system-info {
  padding: 20px 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  background: rgba(0, 0, 0, 0.1);
}

.current-time {
  margin-bottom: 15px;
  text-align: center;
  font-size: 13px;
  color: #a5b1c2;
}

.resource-usage>div {
  margin-bottom: 10px;
}

.cpu-chart,
.memory-chart {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}

.cpu-chart>span:first-child,
.memory-chart>span:first-child {
  width: 45px;
  color: #a5b1c2;
}

.chart-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  margin: 0 8px;
  overflow: hidden;
}

.chart-fill {
  height: 100%;
  border-radius: 3px;
  background: #409EFF;
  transition: width 1.5s ease;
}

.cpu-chart .chart-fill {
  background: #67C23A;
}

.memory-chart .chart-fill {
  background: #E6A23C;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  padding: 15px 30px;
  background: #fff;
  border-bottom: 1px solid #e6e9ed;
  display: 极 flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 5;
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #606266;
}

.breadcrumb span {
  cursor: pointer;
  transition: color 0.3s;
}

.breadcrumb span:first-child:hover {
  color: #409EFF;
}

.breadcrumb i {
  margin: 0 8px;
  font-size: 12px;
  color: #c0c4cc;
}

.system-status {
  display: flex;
}

.status-pill {
  display: flex;
  align-items: center;
  padding: 6px 15px;
  border-radius: 30px;
  font-size: 13px;
  margin-left: 10px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 2px 5px rgba(0, 0, 0, 0.05);
  border: 1px solid #e6e9EE;
}

.status-pill i {
  margin-right: 5px;
  font-size: 14px;
}

.status-pill.running {
  color: #409EFF;
  border-color: rgba(极 64, 158, 255, 0.3);
}

.status-pill.success {
  color: #67C23A;
  border-color: rgba(103, 194, 58, 0.3);
}

.status-pill.waiting {
  color: #909399;
  border-color: rgba(144, 147, 153, 0.3);
}

.status-pill.error {
  color: #F56C6C;
  border-color: rgba(245, 108, 108, 0.3);
}

.content-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 20px;
  gap: 20px;
}

.task-directory {
  width: 280px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  transition: width 0.3s;
}

.directory-header {
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #ebeef5;
  background: #f5f7fa;
}

.directory-header h3 {
  margin: 5px 0 15px;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.directory-header h3 i {
  margin-right: 10px;
  color: #409EFF;
}

.directory-actions {
  display: flex;
  gap: 10px;
}

.el-tree {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  font-size: 14px;
}

.custom-tree-node {
  width: 100%;
  padding: 5px 0;
}

.node-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.node-icon {
  margin-right: 10px;
  font-size: 16px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-badge {
  font-size: 12px;
  background: #f0f2f5;
  border-radius: 30px;
  padding: 2px 8px;
  color: #606266;
}

.task-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.task-list-header {
  padding: 15px 25px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
}

.task-list-header h3 {
  font-size: 16px;
  display: flex;
  align-items: center;
  margin: 0;
  font-weight: 600;
}

.task-list-header h3 i {
  color: #409EFF;
  margin-right: 10px;
  font-size: 18px;
}

.task-list-header h3 small {
  margin-left: 10px;
  font-weight: normal;
  font-size: 14px;
  color: #909399;
}

.task-actions {
  display: flex;
  gap: 10px;
}

.task-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-grid {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 15px;
  overflow-y: auto;
}

.task-grid-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.task-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s, box-shadow 0.3s;
  overflow: hidden;
  border-left: 4px solid #409EFF;
  position: relative;
}

.task-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}

.task-card.running {
  border-color: #409EFF;
}

.task-card.waiting {
  border-color: #909399;
}

.task-card.success {
  border-color: #67C23A;
}

.task-card.error {
  border-color: #F56C6C;
}

.task-card-inner {
  padding: 20px;
}

.task-header {
  display: flex;
  margin-bottom: 15px;
  position: relative;
}

.task-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  margin-right: 15px;
  flex-shrink: 0;
  position: relative;
  background: rgba(64, 158, 255, 0.1);
}

.running .task-icon {
  background: rgba(64, 158, 255, 0.1);
}

.waiting .task-icon {
  background: rgba(144, 147, 153, 0.1);
}

.success .task-icon {
  background: rgba(103, 194, 58, 0.1);
}

.error .task-icon {
  background: rgba(245, 108, 108, 0.1);
}

.task-icon i {
  color: inherit;
}

.task-icon .icon {
  font-size: 24px;
  color: #409EFF;
}

.running .icon {
  color: #409EFF;
}

.waiting .icon {
  color: #909399;
}

.success .icon {
  color: #67C23A;
}

.error .icon {
  color: #F56C6C;
}

.task-state-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.running .task-state-indicator {
  background: #409EFF;
  animation: pulse 1.5s infinite;
}

.waiting .task-state极-indicator {
  background: #909399;
}

.success .task-state-indicator {
  background: #67C23A;
}

.error .task-state-indicator {
  background: #F56C6C;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }

  70% {
    box-shadow: 0 0 0 8px rgba(64, 158, 255, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

.task-title {
  flex: 1;
  min-width: 0;
}

.task-title h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-path {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.task-id {
  margin-left: 8px;
  padding: 2px 6px;
  background: #f0f2f5;
  border-radius: 3px;
  font-size: 10px;
}

.task-priority {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 3px;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 1px;
}

.priority-high {
  background: rgba(245, 108, 108, 0.15);
  color: #F56C6C;
}

.priority-medium {
  background: rgba(230, 162, 60, 0.15);
  color: #E6A23C;
}

.priority-low {
  background: rgba(144, 147, 153, 0.15);
  color: #909399;
}

.task-description {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  border-top: 1px solid #f2f6fc;
  border-bottom: 1px solid #f2f6fc;
  padding: 15px 0;
  margin-bottom: 15px;
}

.meta-row {
  display: flex;
  margin-bottom: 10px;
}

.meta-row:last-child {
  margin-bottom: 0;
}

.meta-item {
  flex: 1;
  font-size: 13px;
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.meta-item label {
  width: 70px;
  color: #909399;
  flex-shrink: 0;
  margin-right: 10px;
}

.status-badge {
  font-weight: 500;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
}

.running .status-badge {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.waiting .status-badge {
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
}

.success .status-badge {
  background: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.error .status-badge {
  background: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}

.task-progress {
  margin: 15px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}

.progress-bar {
  height: 8px;
  background: #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-value {
  height: 100%;
  border-radius: 4px;
  transition: width 1s ease;
}

.running .progress-value {
  background: #409EFF;
}

.waiting .progress-value {
  background: #909399;
}

.success .progress-value {
  background: #67C23A;
}

.error .progress-value {
  background: #F56C6e;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.action-btn {
  padding: 5px;
  font-size: 16px;
  transition: all 0.3s;
}

.action-btn:hover {
  color: #409EFF;
  transform: scale(1.2);
}

.action-btn.delete-btn:hover {
  color: #F56C6C;
}

.no-tasks {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  text-align: center;
  max-width: 400px;
  padding: 40px 0;
}

.placeholder i {
  font-size: 60px;
  color: #dcdfe6;
  margin-bottom: 20px;
}

.placeholder h4 {
  font-size: 18px;
  font-weight: normal;
  margin-bottom: 10px;
  color: #606266;
}

.placeholder p {
  font-size: 14px;
  color: #909399;
  margin-bottom: 20px;
}

.active-view {
  color: #409EFF;
}

.task-list-view {
  flex: 1;
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 15px;
}

.task-name-cell {
  display: flex;
  align-items: center;
}

.task-name-cell .icon {
  font-size: 18px;
  margin-right: 10px;
}

.task-name-cell .task-id {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.priority-high {
  color: #F56C6C;
  font-weight: bold;
}

.priority-medium {
  color: #E6A23C;
  font-weight: bold;
}

.priority-low {
  color: #909399;
  font-weight: bold;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  padding: 40px;
  text-align: center;
}

.chart-placeholder i {
  font-size: 60px;
  margin-bottom: 20px;
  color: #dcdfe6;
}

.chart-placeholder h4 {
  font-size: 18px;
  margin-bottom: 10px;
  color: #606266;
}

.task-detail-panel {
  padding: 10px;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.task-icon i {
  width: 60px;
  height: 60px;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  margin-right: 20px;
  color: white;
}

.task-title {
  flex: 1;
}

.task-title h3 {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.task-id {
  font-size: 13px;
  color: #909399;
}

.task-status {
  padding-right: 15px;
}

.detail-content {
  margin: 20px 0;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  font-weight: 500;
  font-size: 16px;
  color: #303133;
}

.detail-section h4 i {
  margin-right: 8px;
  color: #409EFF;
  font-size: 18px;
}

.description {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

.extra-info {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
  max-height: 200px;
  overflow: auto;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.list-item {
  transition: all 0.8s ease;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s;
}

.list-enter,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

@media (max-width: 1200px) {
  .task-grid {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .content-container {
    flex-direction: column;
  }

  .task-directory {
    width: 100%;
    margin-bottom: 20px;
  }

  .meta-row {
    flex-direction: column;
    gap: 8px;
  }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 覆盖Element UI菜单样式以匹配原有设计 */
.sidebar .el-menu {
  border-right: none !important;
  background-color: transparent !important;
}

.el-menu-item,
.el-submenu__title {
  height: auto !important;
  line-height: inherit !important;
  padding: 14px 25px !important;
  margin: 5px 0 !important;
  border-radius: 0 30px 30px 0 !important;
}

.el-menu-item i,
.el-submenu__title i {
  margin-right: 12px !important;
  font-size: 18px !important;
  width: 20px !important;
  text-align: center !important;
}

.el-menu-item:hover,
.el-submenu__title:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.el-menu-item.is-active,
.el-submenu.is-active .el-submenu__title {
  background: #409EFF !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3) !important;
}

/* 二级菜单样式 */
.el-menu--inline .el-menu-item {
  padding-left: 50px !important;
}

/* 二级菜单弹出层样式 */
.submenu-popper {
  background-color: #1f2d3d !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}
</style>