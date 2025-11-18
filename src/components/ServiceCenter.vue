<template>
  <div class="container">
    <!-- 左侧树形目录 -->
    <div 
      class="tree-container" 
      ref="treeContainer"
      :style="{ width: leftWidth + 'px' }"
    >
      <!-- 搜索框区域 -->
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="输入节点名称搜索"
          prefix-icon="el-icon-search"
          clearable
          size="small"
          @input="handleSearch"
          @clear="clearSearch"
        />
      </div>
      
      <el-tree
        ref="serviceTree"
        :data="filteredTreeData"
        node-key="guid"
        :props="treeProps"
        highlight-current
        :expand-on-click-node="false"
        @node-click="handleNodeClick"
        @node-contextmenu="handleRightClick"
        :indent="16"
        :filter-node-method="filterNode"
        :default-expanded-keys="expandedKeys"
      >
        <template #default="{ node, data }">
          <span class="custom-node">
            <i :class="getNodeIcon(data.type)" style="margin-right:8px"></i>
            <span v-html="highlightMatch(node.label)"></span>
          </span>
        </template>
      </el-tree>
      
      <!-- 右键菜单 -->
      <div v-show="contextMenu.visible" class="context-menu" 
           :style="{ left: contextMenu.left + 'px', top: contextMenu.top + 'px' }">
        <el-menu @select="handleMenuSelect">
          <el-menu-item index="addApplication" :disabled="!canAddApplication">
            <i class="el-icon-document-add"></i>
            <span>添加应用</span>
          </el-menu-item>
          <el-menu-item index="addService" :disabled="!canAddService">
            <i class="el-icon-plus"></i>
            <span>添加服务</span>
          </el-menu-item>
          <el-menu-item index="delete" class="danger-item">
            <i class="el-icon-delete"></i>
            <span>删除</span>
          </el-menu-item>
        </el-menu>
      </div>
    </div>

    <!-- 可拖拽的分隔条 -->
    <div 
      class="splitter" 
      @mousedown="startDrag"
      :style="{ left: (leftWidth - 2) + 'px' }"
    ></div>

    <!-- 右侧编辑区 -->
    <div class="edit-container">
      <div v-if="!currentNode" class="empty-prompt">
        <i class="el-icon-info"></i>
        <p>请从左侧选择服务节点进行编辑</p>
      </div>
      
      <!-- 命名空间编辑表单 -->
      <el-form v-else-if="currentNode.type === 'Namespace'" 
               :model="namespaceForm" label-width="120px">
        <el-form-item label="命名空间名称">
          <el-input v-model="namespaceForm.name"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleSave"
            :loading="saving"
          >保存</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 应用编辑表单 -->
      <el-form v-else-if="currentNode.type === 'ApplicationElement'" 
               :model="applicationForm" label-width="120px">
        <el-form-item label="应用名称">
          <el-input v-model="applicationForm.name"></el-input>
        </el-form-item>
        <el-form-item label="部署方式">
          <el-select v-model="applicationForm.deploymentMethod">
            <el-option label="Kubernetes" value="k8s"></el-option>
            <el-option label="Docker" value="docker"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handle极Save"
            :loading="saving"
          >保存</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 服务编辑表单（增加实例管理功能） -->
      <el-form v-else-if="currentNode.type === 'ServiceElement'" 
               :model="serviceForm" label-width="120px">
        <!-- 服务编辑表单（默认显示） -->
        <div v-if="!showInstanceList">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="服务名称">
                <el-input v-model="serviceForm.name"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="服务类型">
                <el-select v-model="serviceForm.serviceType">
                  <el-option label="REST" value="rest"></el-option>
                  <el-option label="gRPC" value="grpc"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="资源类型">
                <el-select v-model="serviceForm.resourceType">
                  <el-option label="ClusterIP" value="ClusterIP"></el-option>
                  <el-option label="NodePort" value="NodePort"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="别名">
                <el-input v-model="serviceForm.alias"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
            </el-col>
            <el-col :span="12">
              <el-form-item label="实现语言">
                <el-input v-model="serviceForm.primaryImplLang"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="级别">
                <el-input-number 
                  v-model="serviceForm.level" 
                  :min="0" 
                  controls-position="right"
                ></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="描述">
                <el-input 
                  type="textarea" 
                  v-model="serviceForm.description"
                  :rows="2"
                ></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="额外信息">
                <el-input 
                  type="textarea" 
                  v-model="serviceForm.extraInformation"
                  :rows="2"
                ></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="创建时间">
                <el-input v-model="serviceForm.createTime" disabled></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="更新时间">
                <el-input v-model="serviceForm.updateTime" disabled></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="路径">
                <el-input v-model="serviceForm.path" disabled></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          
          <!-- 新增实例管理区域 -->
          <el-row :gutter="20">
            <el-col :span="24">
              <el-divider content-position="left">实例管理</el-divider>
            </el-col>
          </el-row>
          
          <el-row :gutter="20" type="flex" justify="space-between">
            <el-col :span="8"> 
              <el-form-item label=" ">
                <el-button type="success" @click="startServiceInstance" :loading="startingInstance">
                  <i class="el-icon-video-play"></i>启动实例
                </el-button>
              </el-form-item>
            </el-col>
            <el-col :span="8"> 
              <el-form-item label=" ">
                <el-button type="info" @click="queryServiceInstances" :loading="loadingInstances">
                  <i class="el-icon-tickets"></i>查看实例列表
                </el-button>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label=" ">
                <el-button type="primary" @click="handleSave" :loading="saving">
                  保存
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        
        <!-- 实例列表区域（点击"查看实例列表"后显示） -->
        <div v-else-if="currentInstanceView === 'list'">
          <!-- 返回服务编辑按钮 -->
          <el-row :gutter="20">
            <el-col :span="24">
              <el-button 
                class="left-align-button"
                type="primary" 
                icon="el-icon-arrow-left"
                @click="showInstanceList = false"
              >
                返回服务编辑
              </el-button>
            </el-col>
          </el-row>
          
          <!-- 实例列表展示区域 -->
          <el-row :gutter="20">
            <el-col :span="24">
              <el-alert 
                v-if="loadingInstances"
                title="正在加载实例数据，请稍候..." 
                type="info"
                :closable="false"
                show-icon
              />
              
              <el-alert 
                v-else-if="serviceInstances.length === 0"
                title="该服务暂无运行中的实例" 
                type="warning"
                :closable="false"
                show-icon
              />
              
              <template v-else>
                <el-table 
                  :data="paginatedInstances" 
                  stripe 
                  border
                  style="width: 100%; margin-top: 15px"
                >
                  <el-table-column prop="guid" label="实例ID" min-width="180">
                    <template #default="{row}">
                      <el-tag type="info">{{ row.guid }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="120">
                    <template #default="{row}">
                      <el-tag :type="statusTagType(row.status)">
                        {{ row.status }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="latestStartTime" label="启动时间" width="180">
                    <template #default="{row}">
                      {{ formatDateTime(row.latestStartTime) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="ip" label="主机IP" width="140" />
                  <el-table-column prop="runCount" label="运行次数" width="140" />
                  <el-table-column label="操作" width="120">
                    <template #default="{row}">
                      <el-button 
                        size="mini" 
                        type="text"
                        @click="showInstanceDetails(row)"
                      >
                        详情
                      </el-button>
                      <el-button 
            size="mini" 
            type="text"
            style="color: #F56C6C; margin-left: 8px;"
            @click="handleDeleteInstance(row)"
          >
            删除
          </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                
                <!-- 分页控件 -->
                <el-pagination
                  @size-change="handleInstanceSizeChange"
                  @current-change="handleInstancePageChange"
                  :current-page="instancePager.currentPage"
                  :page-sizes="[5, 10, 20, 50]"
                  :page-size="instancePager.pageSize"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="serviceInstances.length"
                  style="margin-top: 20px;"
                >
                </el-pagination>
              </template>
            </el-col>
          </el-row>
        </div>
        
        <!-- 实例详情区域（点击"详情"后显示） -->
        <div v-else-if="currentInstanceView === 'detail' && selectedInstance">
          <!-- 返回实例列表按钮 -->
          <el-row :gutter="20">
            <el-col :span="24">
              <el-button 
                class="left-align-button"
                type="primary" 
                icon="el-icon-arrow-left"
                @click="backToInstanceList"
              >
                返回实例列表
              </el-button>
            </el-col>
          </el-row>
          
          <!-- 实例详情展示区域 -->
          <el-row :gutter="20" style="margin-top: 20px;">
            <el-col :span="24">
              <el-descriptions 
                :column="2" 
                border
                title="实例详情"
              >
                <el-descriptions-item label="实例ID">
                  {{ selectedInstance.guid }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="statusTagType(selectedInstance.status)">
                    {{ selectedInstance.status }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="部署GUID">
                  {{ selectedInstance.deployGuid || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="服务GUID">
                  {{ selectedInstance.serviceGuid || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="主机IP">
                  {{ selectedInstance.ip || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="运行次数">
                  {{ selectedInstance.runCount || '0' }}
                </el-descriptions-item>
                <el-descriptions-item label="启动时间">
                  {{ formatDateTime(selectedInstance.latestStartTime) || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="结束时间">
                  {{ formatDateTime(selectedInstance.latestEndTime) || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="错误原因" v-if="selectedInstance.errorCause">
                  {{ selectedInstance.errorCause }}
                </el-descriptions-item>
                <el-descriptions-item label="运行时长">
                  {{ calculateDuration(selectedInstance.latestStartTime) }}
                </el-descriptions-item>
              </el-descriptions>
            </el-col>
          </el-row>
        </div>
      </el-form>
    </div>
    
    <!-- 添加应用对话框 -->
    <el-dialog
      title="添加应用"
      :visible.sync="addApplicationDialog.visible"
      width="600px"
      @close="closeAddApplicationDialog"
    >
      <el-form :model="addApplicationDialog.form" label-width="120px">
        <el-form-item label="应用名称" required>
          <el-input 
            v-model="addApplicationDialog.form.name" 
            placeholder="请输入应用名称"
            clearable
          ></el-input>
        </el-form-item>
        
        <el-form-item label="部署方式">
          <el-select 
            v-model="addApplicationDialog.form.deploymentMethod" 
            placeholder="请选择部署方式"
            clearable
          >
            <el-option label="Kubernetes" value="k8s"></el-option>
            <el-option label="Docker" value="docker"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="父路径" v-if="addApplicationDialog.form.parentPath">
          <el-input v-model="addApplicationDialog.form.parentPath" disabled></el-input>
        </el-form-item>
      </el-form>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="addApplicationDialog.visible = false">取 消</el-button>
        <el-button type="primary" @click="confirmAddApplication">确 定</el-button>
      </span>
    </el-dialog>
    
    <!-- 添加服务对话框 -->
    <el-dialog
      title="添加服务"
      :visible.sync="serviceDialog.visible"
      width="800px"
      @close="closeServiceDialog"
    >
      <el-form :model="serviceDialog.form" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="服务名称" required>
              <el-input 
                v-model="serviceDialog.form.name" 
                placeholder="请输入服务名称"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务类型">
              <el-select 
                v-model="serviceDialog.form.serviceType" 
                placeholder="请选择服务类型"
                clearable
              >
                <el-option label="REST" value="rest"></el-option>
                <el-option label="gRPC" value="grpc"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="资源类型">
              <el-select 
                v-model="serviceDialog.form.resourceType" 
                placeholder="请选择资源类型"
                clearable
              >
                <el-option label="ClusterIP" value="ClusterIP"></el-option>
                <el-option label="NodePort" value="NodePort"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="别名">
              <el-input 
                v-model="serviceDialog.form.alias" 
                placeholder="请输入别名"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="描述">
              <el-input 
                type="textarea" 
                v-model="serviceDialog.form.description"
                placeholder="请输入服务描述"
                :rows="2"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="实现语言">
              <el-input 
                v-model="serviceDialog.form.primaryImplLang"
                placeholder="如Java、Go、Python等"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="额外信息（详细）">
              <el-input 
                type="textarea" 
                v-model="serviceDialog.form.extraInformation"
                placeholder="请输入详细额外信息"
                :rows="4"
                clearable
                class="wide-textarea"
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="父路径" v-if="serviceDialog.form.parentPath">
          <el-input v-model="serviceDialog.form.parentPath" disabled></el-input>
        </el-form-item>
      </el-form>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="serviceDialog.visible = false">取 消</el-button>
        <el-button type="primary" @click="confirmAddService">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      addApplicationDialog: {
        visible: false,
        form: {
          name: '',
          deploymentMethod: '',
          parentPath: '',
        }
      },
      // 搜索相关数据
      applicationChildren: [],
      searchKeyword: '',
      filteredTreeData: [],
      originalTreeData: [],
      expandedKeys: [],
      debounceTimer: null,
      
      // 树结构数据
      treeData: [],
      treeProps: {
        label: 'name',
        children: 'children'
      },
      currentNode: null,
      contextMenu: {
        visible: false,
        left: 0,
        top: 0,
        node: null
      },
      
      // 表单数据
      namespaceForm: { name: '' },
      applicationForm: { name: '', deploymentMethod: '' },
      serviceForm: { 
        alias: '',
        createTime: '',
        description: '',
        enumId: null,
        extraInformation: '',
        guid: '',
        id: '',
        level: null,
        metaGuid: '',
        metaType: '',
        name: '',
        path: '',
        primaryImplLang: '',
        resourceType: '',
        scenario: '',
        serviceType: '',
        type: '',
        updateTime: ''
      },
      
      // 布局控制
      leftWidth: window.innerWidth * 0.15, // 初始宽度设置为视口的15%
      isDragging: false,
      startX: 0,
      startWidth: 0,
      
      // 添加服务对话框数据
      serviceDialog: {
        visible: false,
        form: {
          name: '',
          alias: '',
          serviceType: '',
          resourceType: '',
          parentPath: '',
          path: '',
          description: '',
          primaryImplLang: '',
          extraInformation: ''
        }
      },
      
      // 保存状态
      saving: false,
      
      // 新增实例管理相关属性
      startingInstance: false,
      loadingInstances: false,
      serviceInstances: [],
      
      // 控制实例列表显示状态
      showInstanceList: false,
      
      // 分页相关属性
      instancePager: {
        currentPage: 1,
        pageSize: 10
      },
      
      // 新增：实例视图状态控制
      currentInstanceView: 'list', // 'list' 或 'detail'
      selectedInstance: null,      // 当前选中的实例详情
    };
  },
  computed: {
    canAddApplication() {
      return this.contextMenu.node?.type === 'Namespace';
    },
    canAddService() {
      return this.contextMenu.node?.type === 'ApplicationElement';
    },
    
    // 计算分页后的实例列表
    paginatedInstances() {
      const start = (this.instancePager.currentPage - 1) * this.instancePager.pageSize;
      const end = start + this.instancePager.pageSize;
      return this.serviceInstances.slice(start, end);
    }
  },
  watch: {
    treeData: {
      handler(newVal) {
        this.originalTreeData = JSON.parse(JSON.stringify(newVal));
        this.filteredTreeData = JSON.parse(JSON.stringify(newVal));
      },
      deep: true,
      immediate: true
    }
  },
  mounted() {
    this.fetchRootTree();
    document.addEventListener('click', () => {
      this.contextMenu.visible = false;
    });
    
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.stopDrag);
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  },
  methods: {
     async handleDeleteInstance(instance) {
    try {
      // 确认删除对话框
      await this.$confirm(
        `确定删除实例 ${instance.guid} 吗？`,
        '警告',
        {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        }
      );
      
      // 调用删除API
      await axios.delete(
        'http://localhost:8080/api/v2/task/server/remove/service/instance',
        {
          params: { serviceGuid: instance.guid }
        }
      );
      
      this.$message.success('实例删除成功');
      
      // 刷新实例列表
      this.queryServiceInstances();
    } catch (error) {
      if (error !== 'cancel') {
        this.$message.error('删除失败: ' + (error.response?.data?.message || error.message));
        console.error('删除失败:', error);
      }
    }
  },
    async deleteNode() {
      try {
        await this.$confirm(`确定删除 ${this.contextMenu.node.name} 及其所有子节点?`, '警告', {
          type: 'warning'
        });
        
        // 根据节点类型选择不同的API路径
        let apiPath = '';
        const node = this.contextMenu.node;
        
        if (node.type === 'ServiceElement') {
          apiPath = 'http://localhost:8080/api/v2/task/server/remove/service';
        } else {
          // 命名空间和应用都使用同一个接口
          apiPath = 'http://localhost:8080/api/v2/task/server/remove/path/child';
        }
        
        await axios.delete(apiPath, {
          params: { path: node.path }
        });
        
        this.$message.success('删除成功');
        this.fetchRootTree();
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除失败');
          console.error('删除失败:', error);
        }
      }
    },
    
    // ================ API调用方法 ================
    async fetchApplicationByGuid(guid) {
      try {
        const response = await axios.get(
          'http://localhost:8080/api/v2/task/server/query/app/by/guid',
          { params: { guid } }
        );
        return response.data.data || {};
      } catch (error) {
        console.error('获取应用详情失败:', error);
        this.$message.error('获取应用详情失败');
        return {};
      }
    },
    
    async fetchRootTree() {
      try {
        const response = await axios.get('http://localhost:8080/api/v2/task/server/query/root/by/path', {
          params: { path: 'root' }
        });
        
        // 确保数据结构正确
        if (response.data && response.data.data) {
          this.treeData = [response.data.data];
        } else if (response.data) {
          this.treeData = [response.data];
        } else {
          throw new Error('无效的响应数据');
        }
      } catch (error) {
        console.warn('根节点加载失败，使用模拟数据:', error);
        // 使用更完整的模拟数据
        this.treeData = [{
          guid: 'root',
          name: '根节点',
          type: 'Namespace',
          path: 'root',
          children: [
            {
              guid: 'app-1',
              name: '示例应用',
              type: 'ApplicationElement',
              path: 'root/示例应用',
              deploymentMethod: 'K8s',
              children: [
                {
                  guid: 'service-1',
                  name: '示例服务',
                  type: 'ServiceElement',
                  path: 'root/示例应用/示例服务',
                  serviceType: 'WebService',
                  resourceType: 'ClusterIP'
                }
              ]
            }
          ]
        }];
      }
    },
    
    async fetchServicesByPath(path) {
      try {
        const response = await axios.get('http://localhost:8080/api/v2/task/server/query/server/by/path', {
          params: { path }
        });
        return response.data.data || [];
      } catch (error) {
        console.error('获取服务列表失败:', error);
        this.$message.error('获取服务列表失败');
        return [];
      }
    },
    
    async fetchServiceByGuid(guid) {
      try {
        const response = await axios.get('http://localhost:8080/api/v2/task/server/query/server/by/guid', {
          params: { guid }
        });
        return response.data.data || {};
      } catch (error) {
        console.error('获取服务详情失败:', error);
        this.$message.error('获取服务详情失败');
        return {};
      }
    },
    
    // ================ 树操作相关方法 ================
    handleSearch() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        if (!this.searchKeyword) {
          this.clearSearch();
          return;
        }
        
        this.expandedKeys = [];
        this.filteredTreeData = this.searchTree(
          JSON.parse(JSON.stringify(this.originalTreeData)), 
          this.searchKeyword
        );
      }, 300);
    },
    
    searchTree(data, keyword) {
      const result = [];
      const keywordLower = keyword.toLowerCase();
      
      const traverse = (node, parentMatch = false) => {
        const isMatch = node.name.toLowerCase().includes(keywordLower);
        const shouldKeep = isMatch || parentMatch;
        
        if (isMatch) {
          this.expandedKeys.push(node.guid);
        }
        
        let hasMatchingChild = false;
        if (node.children && node.children.length) {
          const children = [];
          node.children.forEach(child => {
            const childResult = traverse(child, shouldKeep);
            if (childResult) {
              children.push(childResult);
              hasMatchingChild = true;
            }
          });
          
          if (children.length > 0) {
            node.children = children;
          }
        }
        
        if (isMatch || parentMatch || hasMatchingChild) {
          return { ...node };
        }
        
        return null;
      };
      
      data.forEach(node => {
        const newNode = traverse(node);
        if (newNode) {
          result.push(newNode);
        }
      });
      
      return result;
    },
    
    filterNode(value, data) {
      if (!value) return true;
      return data.name.toLowerCase().includes(value.toLowerCase());
    },
    
    highlightMatch(label) {
      if (!this.searchKeyword) return label;
      
      const searchText = this.searchKeyword.toLowerCase();
      const text = label.toString();
      const index = text.toLowerCase().indexOf(searchText);
      
      if (index === -1) return text;
      
      const before = text.substring(0, index);
      const match = text.substring(index, index + searchText.length);
      const after = text.substring(index + searchText.length);
      
      return `${before}<span class="highlight">${match}</span>${after}`;
    },
    
    clearSearch() {
      this.searchKeyword = '';
      this.filteredTreeData = JSON.parse(JSON.stringify(this.originalTreeData));
      this.expandedKeys = [];
    },
    
    async handleNodeClick(data) {
      this.currentNode = data;
      this.showInstanceList = false; // 切换节点时重置视图
      this.currentInstanceView = 'list'; // 重置实例视图
      
      if (data.type === 'Namespace') {
        this.namespaceForm = { ...data };
      } else if (data.type === 'ApplicationElement') {
        try {
          const appDetail = await this.fetchApplicationByGuid(data.guid);
          this.applicationForm = { 
            ...appDetail,
            name: appDetail.name,
            deploymentMethod: appDetail.deploymentMethod
          };
        } catch (error) {
          console.error('获取应用详情失败:', error);
          this.applicationForm = { 
            ...data,
            name: data.name,
            deploymentMethod: data.deploymentMethod
          };
        }
        this.applicationChildren = await this.fetchServicesByPath(data.path);
      } else if (data.type === 'ServiceElement') {
        const serviceDetail = await this.fetchServiceByGuid(data.guid);
        this.serviceForm = { 
          ...serviceDetail,
          name: serviceDetail.name,
          serviceType: serviceDetail.serviceType,
          resourceType: serviceDetail.resourceType,
          alias: serviceDetail.alias
        };
      }
    },
    
    handleRightClick(event, data) {
      event.preventDefault();
      this.contextMenu = {
        visible: true,
        left: event.clientX,
        top: event.clientY,
        node: data
      };
    },
    
    handleMenuSelect(command) {
      this.contextMenu.visible = false;
      
      switch(command) {
        case 'addApplication':
          this.openAddApplicationDialog();
          break;
        case 'addService':
          this.openAddServiceDialog();
          break;
        case 'delete':
          this.deleteNode();
          break;
      }
    },
    
    getNodeIcon(type) {
      return {
        'Namespace': 'el-icon-folder',
        'ApplicationElement': 'el-icon-document',
        'ServiceElement': 'el-icon-setting'
      }[type] || 'el-icon-question';
    },
    
    // ================ 添加应用对话框方法 ================
    openAddApplicationDialog() {
      if (!this.contextMenu.node) return;
      
      this.addApplicationDialog = {
        visible: true,
        form: {
          name: '新建应用',
          deploymentMethod: 'k8s',
          parentPath: this.contextMenu.node.path,
        }
      };
    },
    
    closeAddApplicationDialog() {
      this.addApplicationDialog = {
        visible: false,
        form: {
          name: '',
          deploymentMethod: '',
          parentPath: '',
        }
      };
    },
    
    async confirmAddApplication() {
      if (!this.addApplicationDialog.form.name) {
        this.$message.warning('应用名称不能为空');
        return;
      }
      
      try {
        const payload = {
          name: this.addApplicationDialog.form.name,
          deploymentMethod: this.addApplicationDialog.form.deploymentMethod,
          parentPath: this.addApplicationDialog.form.parentPath
        };
        
        await axios.post(
          'http://localhost:8080/api/v2/task/server/add/namespace/app/child',
          payload,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        this.$message.success('应用添加成功');
        this.fetchRootTree();
        this.addApplicationDialog.visible = false;
      } catch (error) {
        this.$message.error('添加应用失败');
        console.error('添加应用失败:', {
          config: error.config,
          request: error.request,
          response: error.response
        });
      }
    },
    
    // ================ 添加服务对话框方法 ================
    openAddServiceDialog() {
      if (!this.contextMenu.node) return;
      
      this.serviceDialog = {
        visible: true,
        form: {
          name: '',
          alias: '',
          serviceType: '',
          resourceType: '',
          parentPath: this.contextMenu.node.path,
          path: '',
          description: '',
          primaryImplLang: '',
          extraInformation: ''
        }
      };
    },
    
    closeServiceDialog() {
      this.serviceDialog = {
        visible: false,
        form: {
          name: '',
          alias: '',
          serviceType: '',
          resourceType: '',
          parentPath: '',
          path: '',
          description: '',
          primaryImplLang: '',
          extraInformation: ''
        }
      };
    },
    
    async confirmAddService() {
      if (!this.serviceDialog.form.name) {
        this.$message.warning('服务名称不能为空');
        return;
      }
      
      try {
        const servicePath = `${this.serviceDialog.form.parentPath}/${this.serviceDialog.form.name}`;
        const payload = {
          ...this.serviceDialog.form,
          path: servicePath,
          description: this.serviceDialog.form.description,
          primaryImplLang: this.serviceDialog.form.primaryImplLang,
          extraInformation: this.serviceDialog.form.extraInformation
        };
        
        await axios.post('http://localhost:8080/api/v2/task/server/add/application/service', payload);
        
        this.$message.success('服务添加成功');
        this.fetchRootTree();
        this.serviceDialog.visible = false;
      } catch (error) {
        this.$message.error('添加服务失败');
        console.error('添加服务失败:', error);
      }
    },
    
    async handleSave() {
      this.saving = true;
      
      try {
        if (this.currentNode.type === 'Namespace') {
          await this.updateNamespace();
        } else if (this.currentNode.type === 'ApplicationElement') {
          await this.updateApplication();
        } else if (this.currentNode.type === 'ServiceElement') {
          await this.updateService();
        }
        
        this.$message.success('保存成功');
        this.fetchRootTree();
      } catch (error) {
        this.$message.error('保存失败');
        console.error('保存失败:', error);
      } finally {
        this.saving = false;
      }
    },
    
    async updateNamespace() {
      const payload = {
        path: this.currentNode.path,
        namespaceUnderAppChildNodeDto: {
          name: this.namespaceForm.name
        }
      };
      
      await axios.post('http://localhost:8080/api/v2/task/server/update/app', payload);
    },
    
    async updateApplication() {
      this.saving = true;
      let requestBody = null; // 在外部声明变量
      
      try {
        const params = new URLSearchParams();
        params.append('path', this.currentNode.path);
        
        // 构造请求体（直接对应后端DTO结构）
        requestBody = {
          name: this.applicationForm.name,
          deploymentMethod: this.applicationForm.deploymentMethod
        };

        // 发送请求（path作为查询参数，DTO作为请求体）
        await axios.post(
          'http://localhost:8080/api/v2/task/server/update/app',
          requestBody,
          { params } // 自动处理为 /update/app?path=xxx
        );

        this.$message.success('应用更新成功');
        this.fetchRootTree(); // 刷新树形结构
      } catch (error) {
        this.$message.error('应用更新失败');
        console.error('更新失败:', {
          request: { 
            path: this.currentNode.path,
            body: requestBody // 现在可以访问requestBody
          },
          error: error.response?.data || error.message
        });
      } finally {
        this.saving = false;
      }
    },

    async updateService() {
      this.saving = true;
      let requestBody = null; // 在外部声明变量
      
      try {
        const params = new URLSearchParams();
        params.append('path', this.currentNode.path);
        
        // 构造请求体（精确匹配后端AppUnderSerChildNodeDto结构）
        requestBody = {
          alias: this.serviceForm.alias,
          description: this.serviceForm.description,
          enumId: this.serviceForm.enumId,
          extraInformation: this.serviceForm.extraInformation,
          guid: this.serviceForm.guid,
          id: this.serviceForm.id,
          level: this.serviceForm.level,
          metaGuid: this.serviceForm.metaGuid,
          metaType: this.serviceForm.metaType,
          name: this.serviceForm.name,
          primaryImplLang: this.serviceForm.primaryImplLang,
          resourceType: this.serviceForm.resourceType,
          scenario: this.serviceForm.scenario,
          serviceType: this.serviceForm.serviceType,
          type: this.serviceForm.type
        };

        // 发送请求（path作为查询参数，DTO作为请求体）
        await axios.post(
          'http://localhost:8080/api/v2/task/server/update/server',
          requestBody,
          { params } // 自动处理为 /update/server?path=xxx
        );

        this.$message.success('服务更新成功');
        this.fetchRootTree(); // 刷新树形结构
      } catch (error) {
        this.$message.error('服务更新失败');
        console.error('更新失败:', {
          request: { 
            path: this.currentNode.path,
            body: requestBody // 现在可以访问requestBody
          },
          error: error.response?.data || error.message
        });
      } finally {
        this.saving = false;
      }
    },
    
    // ================ 新增实例管理方法 ================
    
    // 启动服务实例
    async startServiceInstance() {
      if (!this.serviceForm.guid) {
        this.$message.warning('请先保存服务基本信息');
        return;
      }
      
      this.startingInstance = true;
      try {
        const payload = {
          serviceGuid: this.serviceForm.guid,
          // 可根据需要添加其他启动参数
          // 例如：resourceType: this.serviceForm.resourceType
        };
        
        await axios.post(
          'http://localhost:8080/api/v2/task/server/start/service/instance',
          payload
        );
        
        this.$message.success('服务实例启动指令已发送');
        // 自动刷新实例列表
        setTimeout(() => {
          this.resetInstancePager(); // 重置分页状态
          this.queryServiceInstances();
        }, 2000);
      } catch (error) {
        this.$message.error('启动服务实例失败');
        console.error('启动失败:', error);
      } finally {
        this.startingInstance = false;
      }
    },
    
    // 查询服务实例
    async queryServiceInstances() {
      if (!this.serviceForm.guid) {
        this.$message.warning('请先保存服务基本信息');
        return;
      }
      
      this.loadingInstances = true;
      this.showInstanceList = true; // 显示实例列表区域
      this.currentInstanceView = 'list'; // 确保视图为列表模式
      this.resetInstancePager(); // 重置分页状态到第一页
      
      try {
        const response = await axios.get(
          'http://localhost:8080/api/v2/task/server/query/service/instance',
          {
            params: { serviceGuid: this.serviceForm.guid }
          }
        );
        
        this.serviceInstances = response.data.data || [];
        if (this.serviceInstances.length === 0) {
          this.$message.info('该服务暂无运行中的实例');
        }
      } catch (error) {
        this.$message.error('获取实例列表失败');
        console.error('查询失败:', error);
      } finally {
        this.loadingInstances = false;
      }
    },
    
    // 显示实例详情（内嵌在列表区域）
    showInstanceDetails(instance) {
      this.selectedInstance = instance;
      this.currentInstanceView = 'detail'; // 切换到详情视图
    },
    
    // 返回实例列表
    backToInstanceList() {
      this.currentInstanceView = 'list'; // 切换回列表视图
    },
    
    // 格式化日期时间
    formatDateTime(timestamp) {
      if (!timestamp) return '-';
      return new Date(timestamp).toLocaleString();
    },
    
    // 根据状态获取标签类型
    statusTagType(status) {
      const statusMap = {
        'Running': 'success',
        'Starting': 'warning',
        'Stopping': 'danger',
        'Error': 'danger'
      };
      return statusMap[status] || 'info';
    },
    
    // 计算运行时长
    calculateDuration(startTime) {
      if (!startTime) return '-';
      
      const start = new Date(startTime);
      const now = new Date();
      const diffMs = now - start;
      
      // 转换为可读格式
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}小时${minutes}分钟`;
    },
    
    // ================ 分页相关方法 ================
    
    // 处理实例分页大小变化
    handleInstanceSizeChange(size) {
      this.instancePager.pageSize = size;
      this.instancePager.currentPage = 1; // 重置到第一页
    },
    
    // 处理实例页码变化
    handleInstancePageChange(page) {
      this.instancePager.currentPage = page;
    },
    
    // 重置实例分页状态
    resetInstancePager() {
      this.instancePager.currentPage = 1;
    },
    
    // ================ 布局相关方法 ================
    startDrag(event) {
      this.isDragging = true;
      this.startX = event.clientX;
      this.startWidth = this.leftWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    
    handleDrag(event) {
      if (!this.isDragging) return;
      
      const offsetX = event.clientX - this.startX;
      let newWidth = this.startWidth + offsetX;
      
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.7;
      
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      
      this.leftWidth = newWidth;
    },
    
    stopDrag() {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }
};
</script>

<style scoped>
/* 原有样式保持不变 */
.left-align-button {
  float: left; /* 左浮动 */
  margin-left: 0; /* 清除默认边距 */
}
.container {
  display: flex;
  height: 100vh;
  position: relative;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.search-bar {
  padding: 12px 15px 8px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  position: sticky;
  top: 0;
  z-index: 10;
}

:deep(.custom-node .highlight) {
  background-color: #ffd43b;
  color: #333;
  padding: 0 2px;
  border-radius: 2px;
}

.tree-container {
  position: relative;
  height: 100%;
  overflow: auto;
  padding: 15px 0;
  background-color: #f5f7fa;
  transition: width 0.2s ease;
  min-width: 200px;
  max-width: 70%;
  box-sizing: border-box;
}

.tree-container::-webkit-scrollbar {
  width: 8px;
}

.tree-container::-webkit-scrollbar-track {
  background: #f5f7fa;
  border-left: 1px solid #e4e7ed;
}

.tree-container::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 4px;
  border: 2px solid #f5f7fa;
}

.tree-container::-webkit-scrollbar-thumb:hover {
  background-color: #a8abb2;
}

:deep(.el-tree) {
  background-color: transparent;
  padding: 0 15px;
  color: #333;
}

:deep(.el-tree-node) {
  position: relative;
  padding-left: 8px;
}

:deep(.el-tree-node::before) {
  content: "";
  position: absolute;
  top: -10px;
  left: 12px;
  width: 1px;
  height: calc(100% + 20px);
  border-left: 1px dashed #c0c4cc;
  z-index: 1;
}

:deep(.el-tree-node::after) {
  content: "";
  position: absolute;
  top: 18px;
  left: 12px;
  width: 12px;
  height: 1px;
  border-top: 1px dashed #c0c4cc;
  z-index: 1;
}

:deep(.el-tree-node__content) {
  height: 36px;
  transition: all 0.3s;
  position: relative;
  z-index: 2;
  margin-bottom: 4px;
  border-radius: 4px;
}

:deep(.el-tree-node__content:hover) {
  background-color: #ecf5ff;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background-color: #ecf5ff;
  font-weight: 500;
  color: #0079FE;
}

:deep(.el-tree-node__expand-icon) {
  color: #606266;
  font-size: 16px;
  transition: transform 0.3s;
  margin-right: 8px;
  position: relative;
  z-index: 2;
  padding: 4px;
  border-radius: 4px;
}

:deep(.el-tree-node__expand-icon:hover) {
  background-color: #e6f7ff;
}

:deep(.el-tree-node__expand-icon.expanded) {
  transform: rotate(90deg);
  color: #0079FE;
}

:deep(.el-tree-node__expand-icon.is-leaf) {
  color: transparent;
  visibility: hidden;
}

.splitter {
  position: absolute;
  top: 0;
  width: 5px;
  height: 100%;
  background-color: #f0f2f5;
  cursor: col-resize;
  z-index: 100;
  transition: background-color 0.3s;
}

.splitter:hover {
  background-color: #0079FE;
}

.edit-container {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background-color: #ffffff;
  height: 100%;
  box-sizing: border-box;
}

.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.custom-node {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.danger-item {
  color: #f56c6c;
}

.empty-prompt {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
}

.tree-container, .edit-container {
  transition: all 0.3s ease;
}

@supports (-moz-appearance: none) {
  .tree-container {
    scrollbar-width: thin;
    scrollbar-color: #c0c4cc #f5f7fa;
  }
}

:deep(.custom-node i.el-icon-folder) {
  color: #0079FE;
  font-size: 16px;
}

:deep(.custom-node i.el-icon-document) {
  color: #00A870;
  font-size: 16px;
}

:deep(.custom-node i.el-icon-setting) {
  color: #F5A623;
  font-size: 16px;
}

:deep(.custom-node i.el-icon-question) {
  color: #909399;
  font-size: 16px;
}

:deep(.el-tree-node__expand-icon:before) {
  content: "";
  display: inline-block;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 5px solid #606266;
  transition: transform 0.3s;
  transform: rotate(0deg);
}

:deep(.el-tree-node__expand-icon.expanded:before) {
  transform: rotate(90deg);
  border-left-color: #0079FE;
}

:deep(.el-tree-node__expand-icon.is-leaf:before) {
  display: none;
}

.el-form-item {
  margin-bottom: 18px;
}
.el-row {
  margin-bottom: 10px;
}

.dialog-footer {
  text-align: right;
}

.wide-textarea :deep(.el-textarea__inner) {
  min-width: 100%;
  min-height: 120px;
  resize: vertical;
}

/* 新增实例表格样式 */
:deep(.el-table .el-table__row) {
  transition: background-color 0.3s;
}

:deep(.el-table .el-table__row:hover) {
  background-color: #f5f7fa;
}

:deep(.el-table .cell) {
  padding: 8px 10px;
}

:deep(.el-table .el-button--text) {
  padding: 0;
  font-size: 13px;
}

/* 实例详情对话框样式 */
:deep(.el-descriptions__body) {
  padding: 20px;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  color: #606266;
}

:deep(.el-descriptions__content) {
  color: #303133;
}

/* 分页控件样式 */
.el-pagination {
  margin-top: 20px;
  text-align: right;
}

.el-pagination .btn-prev,
.el-pagination .btn-next,
.el-pagination .el-pager li {
  min-width: 32px;
  height: 32px;
  line-height: 32px;
  margin: 0 2px;
}

.el-pagination .el-pager li {
  border-radius: 4px;
  background: #f4f4f5;
}

.el-pagination .el-pager li.active {
  background-color: #0079FE;
  color: white;
  font-weight: bold;
}

.el-pagination .el-pagination__sizes {
  margin: 0 10px;
}

.el-pagination .el-pagination__jump {
  margin-left: 10px;
}

.el-pagination .el-pagination__total {
  margin-right: 10px;
}
</style>