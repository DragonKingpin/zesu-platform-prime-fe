<template>
  <div class="economic-calendar">
    <!-- 日历头部控制区 -->
    <div class="calendar-header">
      <div class="header-left">
        <h2><i class="el-icon-date"></i>经济事件日历</h2>
        <div class="view-controls">
          <el-button-group>
            <el-button :type="viewMode === 'month' ? 'primary' : ''" @click="changeView('dayGridMonth')">月视图</el-button>
            <el-button :type="viewMode === 'week' ? 'primary' : ''" @click="changeView('timeGridWeek')">周视图</el-button>
            <el-button :type="viewMode === 'day' ? 'primary' : ''" @click="changeView('timeGridDay')">日视图</el-button>
          </el-button-group>
        </div>
      </div>

      <div class="header-right">
        <div class="impact-stats">
          <div class="stat-item high">
            <i class="el-icon-warning-outline"></i>
            <span>高影响</span>
            <strong>{{ highImpactCount }}</strong>
          </div>
          <div class="stat-item medium">
            <i class="el-icon-info-outline"></i>
            <span>中影响</span>
            <strong>{{ mediumImpactCount }}</strong>
          </div>
          <div class="stat-item low">
            <i class="el-icon-check"></i>
            <span>低影响</span>
            <strong>{{ lowImpactCount }}</strong>
          </div>
        </div>


      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 日历容器 -->
      <div class="calendar-container">
        <FullCalendar ref="calendar" :options="calendarOptions" :class="{ 'calendar-dragging': isDragging }" />
      </div>

      <!-- 右侧信息面板 -->
      <div class="side-panel">
        <!-- 添加事件表单 -->
        <div class="panel-section add-event-section">
          <div class="form-card">
            <div class="form-header">
              <h3>快速添加事件</h3>
              <p class="form-subtitle">创建新的经济事件</p>
            </div>
            
            <div class="event-actions">
              <el-form :model="quickEventForm" class="enhanced-form">
                <el-form-item label="事件标题" class="custom-form-item">
                  <div class="input-wrapper">
                    <el-input 
                      v-model="quickEventForm.title" 
                      placeholder="输入事件标题"
                      class="enhanced-input"
                      clearable>
                    </el-input>
                  </div>
                </el-form-item>
                
                <el-form-item label="重要性等级" class="custom-form-item">
                  <div class="input-wrapper">
                    <el-select 
                      v-model="quickEventForm.impact" 
                      placeholder="选择重要性等级"
                      class="enhanced-select"
                      :popper-append-to-body="false">
                      <el-option 
                        label="高" 
                        value="high"
                        class="option-high">
                      </el-option>
                      <el-option 
                        label="中" 
                        value="medium"
                        class="option-medium">
                      </el-option>
                      <el-option 
                        label="低" 
                        value="low"
                        class="option-low">
                      </el-option>
                    </el-select>
                  </div>
                </el-form-item>

                <el-form-item class="action-form-item">
                  <el-button 
                    type="primary" 
                    @click="quickAddEvent" 
                    class="add-event-btn"
                    :loading="isAdding">
                    <i class="el-icon-plus"></i>
                    <span v-if="!isAdding">添加事件</span>
                    <span v-else>正在添加...</span>
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 事件详情弹窗 -->
    <el-dialog v-model="eventDialogVisible" :title="selectedEvent ? selectedEvent.title : '事件详情'" width="600px"
      class="event-detail-dialog">
      <div v-if="selectedEvent" class="event-detail-content">
        <div class="event-header">
          <h3>{{ selectedEvent.title }}</h3>
          <el-tag :type="getImpactTagType(selectedEvent.extendedProps.impact)" size="large">
            {{ getImpactText(selectedEvent.extendedProps.impact) }}
          </el-tag>
        </div>

        <div class="event-info">
          <div class="info-row">
            <i class="el-icon-time"></i>
            <span>时间：{{ formatEventTime(selectedEvent) }}</span>
          </div>
          <div class="info-row">
            <i class="el-icon-location-outline"></i>
            <span>国家：{{ selectedEvent.extendedProps.country }}</span>
          </div>
          <div class="info-row">
            <i class="el-icon-document"></i>
            <span>类型：{{ getCategoryText(selectedEvent.extendedProps.category) }}</span>
          </div>
        </div>

        <div class="event-forecast">
          <h4><i class="el-icon-data-analysis"></i>预期数据</h4>
          <div class="forecast-grid">
            <div class="forecast-item">
              <label>预测值：</label>
              <span class="forecast-value">{{ selectedEvent.extendedProps.forecast }}</span>
            </div>
            <div class="forecast-item">
              <label>前值：</label>
              <span class="previous-value">{{ selectedEvent.extendedProps.previous }}</span>
            </div>
            <div class="forecast-item" v-if="selectedEvent.extendedProps.actual">
              <label>实际值：</label>
              <span class="actual-value">{{ selectedEvent.extendedProps.actual }}</span>
            </div>
          </div>
        </div>

        <div class="event-description">
          <h4><i class="el-icon-tickets"></i>事件描述</h4>
          <p>{{ selectedEvent.extendedProps.description }}</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editEvent" type="primary" icon="el-icon-edit">编辑事件</el-button>
          <el-button @click="deleteEvent" type="danger" icon="el-icon-delete">删除事件</el-button>
          <el-button @click="eventDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 添加事件弹窗 -->
    <el-dialog v-model="addEventDialogVisible" title="添加经济事件" width="500px" class="add-event-dialog">
      <el-form :model="newEvent" label-width="100px">
        <el-form-item label="事件标题">
          <el-input v-model="newEvent.title" placeholder="输入事件标题"></el-input>
        </el-form-item>

        <el-form-item label="事件时间">
          <el-date-picker v-model="newEvent.date" type="datetime" placeholder="选择事件时间" format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"></el-date-picker>
        </el-form-item>

        <el-form-item label="国家/地区">
          <el-select v-model="newEvent.country" placeholder="选择国家/地区">
            <el-option label="美国" value="美国"></el-option>
            <el-option label="中国" value="中国"></el-option>
            <el-option label="日本" value="日本"></el-option>
            <el-option label="英国" value="英国"></el-option>
            <el-option label="欧元区" value="欧元区"></el-option>
            <el-option label="德国" value="德国"></el-option>
            <el-option label="法国" value="法国"></el-option>
            <el-option label="澳大利亚" value="澳大利亚"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="事件类型">
          <el-select v-model="newEvent.category" placeholder="选择事件类型">
            <el-option label="央行决议" value="central-bank"></el-option>
            <el-option label="GDP数据" value="gdp"></el-option>
            <el-option label="通胀数据" value="inflation"></el-option>
            <el-option label="就业数据" value="employment"></el-option>
            <el-option label="制造业PMI" value="manufacturing-pmi"></el-option>
            <el-option label="零售销售" value="retail-sales"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="影响程度">
          <el-select v-model="newEvent.impact" placeholder="选择影响程度">
            <el-option label="高影响" value="high"></el-option>
            <el-option label="中影响" value="medium"></el-option>
            <el-option label="低影响" value="low"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="预测值">
          <el-input v-model="newEvent.forecast" placeholder="输入预测值"></el-input>
        </el-form-item>

        <el-form-item label="前值">
          <el-input v-model="newEvent.previous" placeholder="输入前值"></el-input>
        </el-form-item>

        <el-form-item label="事件描述">
          <el-input v-model="newEvent.description" type="textarea" :rows="3" placeholder="输入事件详细描述"></el-input>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addEventDialogVisible = false">取消</el-button>
          <el-button @click="confirmAddEvent" type="primary">添加事件</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import FullCalendar from '@fullcalendar/vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

export default {
  name: 'EconomicCalendar',
  components: {
    FullCalendar
  },
  data() {
    return {
      eventDialogVisible: false,
      addEventDialogVisible: false,
      selectedEvent: null,
      isDragging: false,
      isAdding: false,
      viewMode: 'month',
      // 快速添加事件表单
      quickEventForm: {
        title: '',
        impact: ''
      },
      newEvent: {
        title: '',
        date: '',
        country: '',
        category: '',
        impact: '',
        forecast: '',
        previous: '',
        description: ''
      },
      calendarOptions: {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
          today: '今天',
          month: '月',
          week: '周',
          day: '日'
        },
        locale: 'zh-cn',
        firstDay: 1,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        events: [], // 初始为空，created中设置
        eventClick: this.handleEventClick,
        dateClick: this.handleDateClick,
        eventDidMount: this.handleEventDidMount,
        eventDrop: this.handleEventDrop,
        eventResize: this.handleEventResize,
        select: this.handleDateSelect,
        editable: true,
        eventDurationEditable: true,
        eventStartEditable: true,
        eventDragMinDistance: 10,
        dragScroll: true,
        // 启用事件调整时的实时预览
        eventResizeStart: this.handleEventResizeStart,
        eventResizeStop: this.handleEventResizeStop,
        height: 'auto',
        eventContent: this.renderEventContent,
        eventClassNames: this.getEventClassNames,
        eventBackgroundColor: this.getEventColor,
        eventBorderColor: this.getEventColor,
        selectOverlap: false,
        droppable: true,
        // 日历主题和样式定制
        themeSystem: 'standard',
        // 允许事件拖拽
        eventAllow: () => {
          return true;
        },
        // 优化日历显示
        dayHeaderFormat: { weekday: 'long' },
        slotMinTime: '06:00:00',
        slotMaxTime: '22:00:00',
        expandRows: true,
        handleWindowResize: true,
        windowResizeDelay: 100,
      },
      // 添加定时器引用和初始化状态跟踪
      calendarInitTimer: null,
      resizeTimer: null,
      // 防止重复初始化
      isInitialized: false,
      // 拖拽状态和预览数据
      resizeDragState: {
        isDragging: false,
        dragEvent: null,
        targetDate: null,
        previewDays: 0,
        startDate: null,
        endDate: null
      },
    };
  },
  created() {
    // 在组件创建时立即准备事件数据，避免异步延迟
    this.calendarOptions.events = this.getMockEvents();
  },
  mounted() {
    // 组件挂载后，等待DOM完全准备好后进行初始化
    this.$nextTick(() => {
      // 确保refs可用后再初始化
      if (this.$refs.calendar) {
        this.initializeCalendarProperly();
      } else {
        // 如果refs还未准备好，等待一帧后重试
        this.$nextTick(() => {
          this.initializeCalendarProperly();
        });
      }
    });
  },
  beforeUnmount() {
    // 移除窗口大小变化监听器
    window.removeEventListener('resize', this.handleWindowResize);
  },
  computed: {
    highImpactCount() {
      const events = this.getMockEvents();
      return events.filter(event => event.extendedProps.impact === 'high').length;
    },
    mediumImpactCount() {
      const events = this.getMockEvents();
      return events.filter(event => event.extendedProps.impact === 'medium').length;
    },
    lowImpactCount() {
      const events = this.getMockEvents();
      return events.filter(event => event.extendedProps.impact === 'low').length;
    },

    todayEvents() {
      const today = new Date().toISOString().split('T')[0];
      const events = this.getMockEvents();
      return events.filter(event => event.start.startsWith(today));
    }
  },
  methods: {
    changeView(viewType) {
      const calendarApi = this.$refs.calendar.getApi();
      calendarApi.changeView(viewType);
      this.viewMode = viewType === 'dayGridMonth' ? 'month' :
        viewType === 'timeGridWeek' ? 'week' : 'day';
    },

    // 初始化日历，确保渲染正确
    initializeCalendarProperly() {
      if (this.isInitialized || !this.$refs.calendar) {
        return;
      }

      try {
        const calendarApi = this.$refs.calendar.getApi();
        
        // 简单的尺寸更新，不使用复杂的多层延迟
        this.$nextTick(() => {
          calendarApi.updateSize();
          this.isInitialized = true;
          console.log('日历初始化完成，渲染正常');
        });
        
      } catch (error) {
        console.error('日历初始化失败:', error);
        // 简单的重试机制
        setTimeout(() => {
          this.initializeCalendarProperly();
        }, 200);
      }
    },

    // 监听窗口大小变化，确保日历响应式布局
    handleWindowResize() {
      // 移除复杂的定时器，直接更新尺寸
      const calendarApi = this.$refs.calendar?.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
      }
    },


    getMockEvents() {
      const events = [
        {
          id: '1',
          title: '美联储利率决议',
          start: '2024-12-15T21:30:00',
          end: '2024-12-15T22:30:00',
          extendedProps: {
            category: 'central-bank',
            impact: 'high',
            country: '美国',
            forecast: '5.25-5.50%',
            previous: '5.00-5.25%',
            actual: '',
            description: '美国联邦公开市场委员会利率决议，对全球经济具有重大影响。'
          }
        },
        {
          id: '2',
          title: '中国GDP年率',
          start: '2024-12-16T02:00:00',
          end: '2024-12-16T03:30:00',
          extendedProps: {
            category: 'gdp',
            impact: 'high',
            country: '中国',
            forecast: '5.0%',
            previous: '4.9%',
            actual: '',
            description: '中国第三季度GDP增长率，反映中国经济基本面状况。'
          }
        },
        {
          id: '3',
          title: '美国CPI月率',
          start: '2024-12-17T13:30:00',
          end: '2024-12-17T15:00:00',
          extendedProps: {
            category: 'inflation',
            impact: 'high',
            country: '美国',
            forecast: '0.3%',
            previous: '0.2%',
            actual: '0.4%',
            description: '美国消费者物价指数，反映通胀水平变化。'
          }
        },
        {
          id: '4',
          title: '欧元区制造业PMI',
          start: '2024-12-18T09:00:00',
          end: '2024-12-18T10:30:00',
          extendedProps: {
            category: 'manufacturing-pmi',
            impact: 'medium',
            country: '欧元区',
            forecast: '48.5',
            previous: '48.2',
            actual: '',
            description: '制造业采购经理人指数，反映制造业景气度。'
          }
        },
        {
          id: '5',
          title: '日本失业率',
          start: '2024-12-19T23:50:00',
          end: '2024-12-20T00:30:00',
          extendedProps: {
            category: 'employment',
            impact: 'medium',
            country: '日本',
            forecast: '2.5%',
            previous: '2.6%',
            actual: '',
            description: '日本失业率，反映劳动力市场状况。'
          }
        },
        {
          id: '6',
          title: '英国零售销售月率',
          start: '2024-12-20T09:30:00',
          end: '2024-12-20T11:00:00',
          extendedProps: {
            category: 'retail-sales',
            impact: 'medium',
            country: '英国',
            forecast: '0.2%',
            previous: '-0.3%',
            actual: '',
            description: '英国零售销售数据，反映消费支出变化。'
          }
        },
        {
          id: '7',
          title: 'G7峰会',
          start: '2024-12-21T08:00:00',
          end: '2024-12-21T18:00:00',
          extendedProps: {
            category: 'central-bank',
            impact: 'high',
            country: '美国',
            forecast: '重要政策讨论',
            previous: '上次峰会',
            actual: '',
            description: '七国集团领导人峰会，讨论全球经济政策协调。'
          }
        },
        {
          id: '8',
          title: '欧盟经济论坛',
          start: '2024-12-21T14:00:00',
          end: '2024-12-22T16:00:00',
          extendedProps: {
            category: 'economic-forum',
            impact: 'medium',
            country: '欧盟',
            forecast: '政策讨论',
            previous: '未举办',
            actual: '',
            description: '为期两天的欧盟经济论坛，探讨欧洲经济未来发展。'
          }
        }
      ];

      return events;
    },

    handleEventClick(info) {
      this.selectedEvent = info.event;
      this.eventDialogVisible = true;
    },

    handleDateClick(info) {
      // 点击日期时打开添加事件对话框
      this.newEvent.date = info.dateStr;
      this.addEventDialogVisible = true;
    },

    handleDateSelect() {
      // 选中日期范围时的处理
      this.addEventDialogVisible = true;
    },

    handleEventDrop(info) {
      // 计算移动的天数
      const oldStart = info.oldEvent.start;
      const newStart = info.event.start;
      const timeDiff = newStart.getTime() - oldStart.getTime();
      const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

      // 显示更详细的反馈
      if (daysDiff === 0) {
        this.$message.success('事件时间已调整');
      } else if (daysDiff > 0) {
        this.$message.success(`事件已推迟 ${daysDiff} 天`);
      } else {
        this.$message.success(`事件已提前 ${Math.abs(daysDiff)} 天`);
      }

      // 添加成功动画效果
      info.el.classList.add('event-drop-success');
      setTimeout(() => {
        info.el.classList.remove('event-drop-success');
      }, 400);

      console.log('事件移动:', {
        id: info.event.id,
        title: info.event.title,
        从: oldStart,
        到: newStart,
        天数差: daysDiff
      });
    },

    handleEventResize(info) {
      if (info && info.event) {
        const event = info.event;
        const startDate = new Date(event.start);
        const endDate = event.end ? new Date(event.end) : startDate;
        
        // 计算实际持续天数
        const actualDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        this.$message.success(`事件时长已调整为 ${actualDays} 天`);
        
        // 触发自定义事件，用于同步其他组件
        this.$emit('eventResized', {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          duration: actualDays
        });
      } else {
        this.$message.success('事件时长已调整');
      }
    },

    // 事件调整开始
    handleEventResizeStart(info) {
      if (info && info.event) {
        const event = info.event;
        const startDate = new Date(event.start);
        const endDate = event.end ? new Date(event.end) : startDate;
        
        this.resizeDragState = {
          isDragging: true,
          dragEvent: event,
          startDate: startDate,
          endDate: endDate,
          previewDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1,
          targetDate: null
        };
        
        // 显示拖拽提示
        this.$message.info('拖拽右侧边缘调整事件时长');
        
        // 创建预览覆盖层
        this.createResizePreviewOverlay(event);
      }
    },

    // 事件调整结束
    handleEventResizeStop(info) {
      if (info && info.event) {
        this.resizeDragState.isDragging = false;
        
        // 移除预览覆盖层
        this.removeResizePreviewOverlay();
        
        // 清理状态
        this.resizeDragState = {
          isDragging: false,
          dragEvent: null,
          targetDate: null,
          previewDays: 0,
          startDate: null,
          endDate: null
        };
      }
    },

    // 创建拖拽预览覆盖层
    createResizePreviewOverlay(event) {
      try {
        // 移除可能存在的旧覆盖层
        this.removeResizePreviewOverlay();
        
        // 获取日历容器
        const calendarContainer = this.$refs.calendar?.el;
        if (!calendarContainer) return;
        
        // 创建覆盖层元素
        const overlay = document.createElement('div');
        overlay.id = 'resize-preview-overlay';
        overlay.className = 'resize-preview-overlay';
        overlay.innerHTML = this.generatePreviewHTML(event);
        
        // 添加到日历容器
        calendarContainer.appendChild(overlay);
        
        // 更新当前状态
        this.resizeDragState.overlay = overlay;
        
        console.log('拖拽预览覆盖层已创建');
      } catch (error) {
        console.error('创建预览覆盖层失败:', error);
      }
    },

    // 移除拖拽预览覆盖层
    removeResizePreviewOverlay() {
      try {
        const existingOverlay = document.getElementById('resize-preview-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
        // 清理状态中的覆盖层引用
        if (this.resizeDragState.overlay) {
          delete this.resizeDragState.overlay;
        }
      } catch (error) {
        console.error('移除预览覆盖层失败:', error);
      }
    },

    // 生成预览HTML
    generatePreviewHTML(event) {
      const startDate = new Date(event.start);
      const previewDays = this.resizeDragState.previewDays;
      
      return `
        <div class="resize-preview-container">
          <div class="resize-preview-tooltip">
            <div class="tooltip-content">
              <div class="tooltip-title">事件时长预览</div>
              <div class="tooltip-info">
                <span class="duration">共 ${previewDays} 天</span>
                <span class="date-range">${startDate.toLocaleDateString('zh-CN')} 起</span>
              </div>
              <div class="tooltip-arrow"></div>
            </div>
          </div>
          <div class="resize-preview-highlight"></div>
        </div>
      `;
    },

    // 更新拖拽预览（实时调用）
    updateResizePreview(targetDate) {
      if (!this.resizeDragState.isDragging || !this.resizeDragState.dragEvent) {
        return;
      }
      
      try {
        // 计算新的持续天数
        const startDate = this.resizeDragState.startDate;
        const endDate = new Date(targetDate);
        
        // 确保结束日期不早于开始日期
        if (endDate < startDate) {
          endDate.setTime(startDate.getTime());
        }
        
        const newDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // 更新状态
        this.resizeDragState.targetDate = targetDate;
        this.resizeDragState.previewDays = newDays;
        
        // 更新预览界面
        const overlay = this.resizeDragState.overlay;
        if (overlay) {
          const tooltipContent = overlay.querySelector('.tooltip-content');
          if (tooltipContent) {
            tooltipContent.innerHTML = `
              <div class="tooltip-title">事件时长预览</div>
              <div class="tooltip-info">
                <span class="duration">共 ${newDays} 天</span>
                <span class="date-range">${startDate.toLocaleDateString('zh-CN')} 起</span>
              </div>
              <div class="tooltip-arrow"></div>
            `;
          }
          
          // 更新高亮区域
          this.updateHighlightArea(startDate, endDate, newDays);
        }
        
        console.log(`拖拽预览更新: ${newDays} 天`);
      } catch (error) {
        console.error('更新拖拽预览失败:', error);
      }
    },

    // 更新高亮覆盖区域
    updateHighlightArea(startDate, endDate, days) {
      try {
        // 这里可以实现具体的日历日期高亮逻辑
        // 由于 FullCalendar 的复杂性，这里提供基础框架
        const calendarApi = this.$refs.calendar?.getApi();
        if (calendarApi) {
          // 可以通过视图变化来触发重新渲染
          // 或者操作 DOM 元素来高亮特定日期
          console.log(`高亮日期范围: ${startDate.toDateString()} 到 ${endDate.toDateString()}, 共 ${days} 天`);
        }
      } catch (error) {
        console.error('更新高亮区域失败:', error);
      }
    },

    handleEventDidMount(info) {
      // 为事件添加自定义样式和数据
      const impact = info.event.extendedProps.impact;
      if (impact === 'high') {
        info.el.classList.add('high-impact-event');
      } else if (impact === 'medium') {
        info.el.classList.add('medium-impact-event');
      } else {
        info.el.classList.add('low-impact-event');
      }
    },

    renderEventContent(arg) {
      const event = arg.event;
      const impact = event.extendedProps.impact;
      const country = event.extendedProps.country;

      let impactIcon = '';
      if (impact === 'high') impactIcon = '🔴';
      else if (impact === 'medium') impactIcon = '🟡';
      else impactIcon = '🟢';

      return {
        html: `<div class="economic-event">
          <div class="event-title">${event.title}</div>
          <div class="event-meta">
            <span class="impact-badge ${impact}">${impactIcon} ${this.getImpactText(impact)}</span>
            <span class="country">${country}</span>
          </div>
        </div>`
      };
    },

    getEventClassNames(info) {
      const impact = info.event.extendedProps.impact;
      // 返回美化的CSS类名
      return [`fc-event-impact-${impact}`, 'economic-event-enhanced'];
    },

    getEventColor(info) {
      const impact = info.event.extendedProps.impact;
      // 优化后的专业配色方案
      switch (impact) {
        case 'high': 
          return {
            primary: '#2c5282',  // 深蓝色 - 专业稳重
            secondary: '#3182ce'  // 蓝色
          };
        case 'medium': 
          return {
            primary: '#b7791f',  // 金色 - 稳定重要
            secondary: '#d69e2e'  // 暖金色
          };
        case 'low': 
          return {
            primary: '#2f855a',  // 森林绿 - 正面积极
            secondary: '#38a169'  // 清新绿
          };
        default: 
          return {
            primary: '#4a5568',  // 中性灰蓝
            secondary: '#718096'  // 柔和灰
          };
      }
    },

    getImpactTagType(impact) {
      switch (impact) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'info';
      }
    },

    getImpactText(impact) {
      const impactMap = {
        'high': '高影响',
        'medium': '中影响',
        'low': '低影响'
      };
      return impactMap[impact] || '未知';
    },

    getCategoryText(category) {
      const categoryMap = {
        'central-bank': '央行决议',
        'gdp': 'GDP数据',
        'inflation': '通胀数据',
        'employment': '就业数据',
        'manufacturing-pmi': '制造业PMI',
        'retail-sales': '零售销售'
      };
      return categoryMap[category] || '其他';
    },

    formatEventTime(event) {
      // 如果传入的是字符串，直接转换为事件对象格式
      const eventData = typeof event === 'string' ? { start: event } : event;
      
      if (!eventData.start) {
        return '时间未知';
      }

      const startDate = new Date(eventData.start);
      
      // 如果没有结束时间，只显示开始时间
      if (!eventData.end) {
        return startDate.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      // 有结束时间的情况
      const endDate = new Date(eventData.end);
      const startStr = startDate.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const endStr = endDate.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 判断是否跨天
      const isSameDay = startDate.toDateString() === endDate.toDateString();
      
      if (isSameDay) {
        // 同一天，显示为 "MM-DD HH:MM - HH:MM"
        const startTime = startDate.toLocaleString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const endTime = endDate.toLocaleString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
        return `${startDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} ${startTime} - ${endTime}`;
      } else {
        // 跨天，显示为完整的日期时间范围
        return `${startStr} - ${endStr}`;
      }
    },

    editEvent() {
      this.$message.info('编辑功能开发中...');
    },

    deleteEvent() {
      this.$confirm('确定要删除这个事件吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const calendarApi = this.$refs.calendar.getApi();
        calendarApi.getEventById(this.selectedEvent.id).remove();
        this.eventDialogVisible = false;
        this.$message.success('事件已删除');
      });
    },

    confirmAddEvent() {
      if (!this.newEvent.title || !this.newEvent.date) {
        this.$message.warning('请填写必要信息');
        return;
      }

      const newEvent = {
        id: Date.now().toString(),
        title: this.newEvent.title,
        start: this.newEvent.date,
        extendedProps: {
          category: this.newEvent.category,
          impact: this.newEvent.impact,
          country: this.newEvent.country,
          forecast: this.newEvent.forecast,
          previous: this.newEvent.previous,
          actual: '',
          description: this.newEvent.description
        }
      };

      const calendarApi = this.$refs.calendar.getApi();
      calendarApi.addEvent(newEvent);

      // 重置表单
      this.newEvent = {
        title: '',
        date: '',
        country: '',
        category: '',
        impact: '',
        forecast: '',
        previous: '',
        description: ''
      };

      this.addEventDialogVisible = false;
      this.$message.success('事件已添加');
    },

    editEventDetails(event) {
      this.selectedEvent = event;
      this.eventDialogVisible = true;
    },

    showAddEventDialog() {
      this.addEventDialogVisible = true;
    },

    async quickAddEvent() {
      // 验证表单
      if (!this.quickEventForm.title) {
        this.$message.warning('请输入事件名称');
        return;
      }
      if (!this.quickEventForm.impact) {
        this.$message.warning('请选择事件重要性');
        return;
      }

      // 设置加载状态
      this.isAdding = true;

      try {
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

        // 创建新事件
        const newEvent = {
          id: Date.now().toString(),
          title: this.quickEventForm.title,
          start: nextHour.toISOString().slice(0, 16),
          extendedProps: {
            category: 'central-bank',
            impact: this.quickEventForm.impact,
            country: '美国',
            forecast: '待定',
            previous: '待定',
            actual: '',
            description: '通过快速添加创建的事件'
          }
        };

        // 添加到日历
        const calendarApi = this.$refs.calendar.getApi();
        calendarApi.addEvent(newEvent);

        // 重置表单
        this.quickEventForm.title = '';
        this.quickEventForm.impact = '';

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        this.$message.success('事件添加成功！');
      } catch (error) {
        this.$message.error('添加事件失败，请重试');
      } finally {
        this.isAdding = false;
      }
    },

    exportEvents() {
      const calendarApi = this.$refs.calendar.getApi();
      const events = calendarApi.getEvents();

      const eventData = events.map(event => ({
        title: event.title,
        start: event.start,
        end: event.end,
        country: event.extendedProps.country,
        impact: event.extendedProps.impact,
        category: event.extendedProps.category,
        forecast: event.extendedProps.forecast,
        previous: event.extendedProps.previous,
        description: event.extendedProps.description
      }));

      const dataStr = JSON.stringify(eventData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'economic-events-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click();

      URL.revokeObjectURL(url);
      this.$message.success('事件数据已导出');
    },

    resetEvents() {
      const calendarApi = this.$refs.calendar.getApi();
      calendarApi.removeAllEvents();

      setTimeout(() => {
        calendarApi.addEventSource(this.getMockEvents());
        this.$message.success('演示数据已重置');
      }, 100);
    },

    updateCalendarView() {
      const calendarApi = this.$refs.calendar.getApi();

      // 更新日历选项
      const options = {
        weekends: !this.hideWeekends,
        businessHours: this.highlightWeekdays ? {
          daysOfWeek: [1, 2, 3, 4, 5], // 周一到周五
          startTime: '09:00',
          endTime: '17:00'
        } : null,
        eventColor: '#409eff'
      };

      // 应用选项
      Object.keys(options).forEach(key => {
        calendarApi.setOption(key, options[key]);
      });

      calendarApi.rerenderEvents();
      this.$message.success('视图设置已更新');
    },
  }
};
</script>

<style scoped>
.economic-calendar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.12);
  overflow: hidden;
}

.calendar-header {
  background: linear-gradient(135deg, #4facfe 0%, #00a8ff 100%);
  color: white;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  box-shadow: 0 4px 20px rgba(79, 172, 254, 0.25);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-controls .el-button-group {
  border-radius: 8px;
  overflow: hidden;
}

.view-controls .el-button {
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.view-controls .el-button--primary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 30px;
}

.impact-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.stat-item strong {
  font-size: 16px;
  font-weight: 700;
}

.stat-item.high strong {
  color: #e53e3e;
}

.stat-item.medium strong {
  color: #3182ce;
}

.stat-item.low strong {
  color: #3182ce;
}

.filter-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  border-radius: 8px;
}

.filter-section .el-checkbox-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-section .el-checkbox {
  color: rgba(255, 255, 255, 0.9);
  margin-right: 0;
}

.filter-section .el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: #fff;
  border-color: #fff;
}

.filter-section .el-checkbox__input.is-checked+.el-checkbox__label {
  color: #fff;
}

.calendar-container {
  flex: 1;
  padding: 20px;
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
}

/* 覆盖默认的FullCalendar样式 */
:deep(.fc) {
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

:deep(.fc-toolbar-title) {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

:deep(.fc-button-primary) {
  background-color: #409eff;
  border-color: #409eff;
  border-radius: 6px;
  font-size: 12px;
  padding: 8px 12px;
}

:deep(.fc-button-primary:hover) {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

:deep(.fc-event) {
  border-radius: 6px;
  border: none;
  font-size: 11px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.economic-event-high) {
  border-left: 4px solid #ff4757;
}

:deep(.economic-event-medium) {
  border-left: 4px solid #ffa502;
}

:deep(.economic-event-low) {
  border-left: 4px solid #26de81;
}

:deep(.economic-event) {
  padding: 4px 8px;
}

:deep(.event-title) {
  font-weight: 600;
  margin-bottom: 2px;
  line-height: 1.2;
}

:deep(.event-meta) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  opacity: 0.8;
}

:deep(.impact-badge) {
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

:deep(.impact-badge.high) {
  background: rgba(44, 82, 130, 0.1);
  color: #2c5282;
}

:deep(.impact-badge.medium) {
  background: rgba(183, 121, 31, 0.1);
  color: #b7791f;
}

:deep(.impact-badge.low) {
  background: rgba(47, 133, 90, 0.1);
  color: #2f855a;
}

:deep(.fc-daygrid-day:hover),
:deep(.fc-timegrid-slot:hover) {
  background-color: rgba(64, 158, 255, 0.05);
}

/* 弹窗样式 */
.event-detail-content {
  padding: 10px 0;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.event-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.event-info {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.info-row i {
  width: 16px;
  color: #409eff;
}

.event-forecast {
  margin-bottom: 20px;
}

.event-forecast h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 16px;
  color: #2c3e50;
}

.forecast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.forecast-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.forecast-value {
  font-weight: 600;
  color: #409eff;
}

.previous-value {
  color: #909399;
}

.actual-value {
  font-weight: 600;
  color: #67c23a;
}

.event-description {
  margin-bottom: 20px;
}

.event-description h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 16px;
  color: #2c3e50;
}

.event-description p {
  line-height: 1.6;
  color: #606266;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 添加事件弹窗 */
.add-event-dialog .el-form-item {
  margin-bottom: 20px;
}

/* 主内容区域样式 */
.main-content {
  display: flex;
  height: calc(100vh - 200px);
  background: #f8fafc;
}

.calendar-container {
  flex: 1;
  padding: 20px;
  background: #f8fafc;
}

/* 右侧信息面板样式 */
.side-panel {
  width: 320px;
  background: white;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
  padding: 20px;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

.panel-section {
  margin-bottom: 24px;
}

.panel-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}

.panel-section h3 i {
  color: #409eff;
}

/* 实时行情样式 */
.market-data {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.market-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #409eff;
}

.symbol {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.price {
  font-weight: 700;
  color: #2c3e50;
  font-size: 14px;
}

.change {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.change.positive {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.change.negative {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

/* 重要提示样式 */
.alerts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid;
}

.alert-item.high {
  background: rgba(245, 108, 108, 0.05);
  border-left-color: #f56c6c;
}

.alert-item.medium {
  background: rgba(255, 167, 2, 0.05);
  border-left-color: #ffa726;
}

.alert-item i {
  font-size: 16px;
  margin-top: 2px;
}

.alert-item.high i {
  color: #f56c6c;
}

.alert-item.medium i {
  color: #ffa726;
}

.alert-content {
  flex: 1;
}

.alert-content strong {
  display: block;
  font-size: 14px;
  color: #2c3e50;
  margin-bottom: 4px;
}

.alert-content p {
  margin: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
}

/* 今日焦点样式 */
.today-events {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.today-event {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  transition: all 0.2s ease;
}

.today-event:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.event-time {
  font-size: 12px;
  font-weight: 600;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  min-width: 70px;
  text-align: center;
}

.event-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-details strong {
  font-size: 14px;
  color: #2c3e50;
  line-height: 1.3;
}

.country {
  font-size: 12px;
  color: #909399;
}

.event-details .el-tag {
  margin-top: 4px;
  align-self: flex-start;
}

/* 右侧面板增强样式 */
.side-panel {
  width: 340px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
  padding: 20px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
}

/* 统计概览卡片样式 */
.stats-overview {
  margin-bottom: 24px;
}

.stats-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f2f5;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f2f5;
}

.stats-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
}

.stats-header h3 i {
  color: #409eff;
  font-size: 20px;
}

.date-display {
  font-size: 12px;
  color: #909399;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  gap: 16px;
}

.stat-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 1px solid;
}

.stat-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-item-card.high-impact {
  background: linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%);
  border-color: #2c5282;
}

.stat-item-card.medium-impact {
  background: linear-gradient(135deg, #fef7e0 0%, #ffffff 100%);
  border-color: #b7791f;
}

.stat-item-card.low-impact {
  background: linear-gradient(135deg, #f0f9f4 0%, #ffffff 100%);
  border-color: #2f855a;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-item-card.high-impact .stat-icon {
  background: linear-gradient(135deg, #2c5282 0%, #3182ce 100%);
  color: white;
}

.stat-item-card.medium-impact .stat-icon {
  background: linear-gradient(135deg, #b7791f 0%, #d69e2e 100%);
  color: white;
}

.stat-item-card.low-impact .stat-icon {
  background: linear-gradient(135deg, #2f855a 0%, #38a169 100%);
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
  display: block;
}

/* 添加事件表单样式 */
.add-event-section {
  margin-bottom: 24px;
}

.form-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f2f5;
}

.form-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f2f5;
}

.form-header h3 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.form-header h3 i {
  color: #67c23a;
  font-size: 20px;
}

.form-subtitle {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.enhanced-form {
  margin-top: 20px;
}

.custom-form-item {
  margin-bottom: 20px;
}

.custom-form-item label {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  display: block;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  z-index: 2;
  color: #c0c4cc;
  font-size: 16px;
}

.enhanced-input {
  width: 100%;
}

.enhanced-input .el-input__inner {
  padding-left: 40px !important;
  border-radius: 12px;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
  font-weight: 500;
}

.enhanced-input .el-input__inner:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.enhanced-select {
  width: 100%;
}

.enhanced-select .el-select-dropdown__item {
  padding: 16px 20px;
  font-size: 16px;
  line-height: 1.4;
  min-height: 48px;
  display: flex;
  align-items: center;
  white-space: normal;
  word-break: break-all;
}

.enhanced-select .el-select-dropdown {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  max-width: 200px;
}

.enhanced-select .el-input__inner {
  padding-left: 40px !important;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
  border-radius: 12px;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
  font-weight: 500;
  height: 48px !important;
  font-size: 16px;
}

.enhanced-select .el-input__inner:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

/* 下拉选项样式 */
.option-high {
  padding: 16px 20px;
  border-radius: 10px;
  margin: 6px 0;
  font-size: 16px;
  line-height: 1.4;
}

.option-medium {
  padding: 16px 20px;
  border-radius: 10px;
  margin: 6px 0;
  font-size: 16px;
  line-height: 1.4;
}

.option-low {
  padding: 16px 20px;
  border-radius: 10px;
  margin: 6px 0;
  font-size: 16px;
  line-height: 1.4;
}

.action-form-item {
  margin-top: 24px;
}

.add-event-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #4facfe 0%, #00a8ff 100%);
  border: none;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.add-event-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
}

.add-event-btn:active {
  transform: translateY(0);
}

/* 快捷操作样式 */
.quick-actions {
  margin-bottom: 0;
}

.action-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f2f5;
}

.action-card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f2f5;
}

.action-card h3 i {
  color: #e6a23c;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.action-btn.secondary {
  border: 2px solid #409eff;
  color: #409eff;
  background: transparent;
}

.action-btn.secondary:hover {
  background: #409eff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
}

.action-btn.warning {
  border: 2px solid #f56c6c;
  color: #f56c6c;
  background: transparent;
}

.action-btn.warning:hover {
  background: #f56c6c;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(245, 108, 108, 0.3);
}

/* 拖拽功能增强样式 */
.calendar-dragging {
  cursor: grabbing !important;
}

.calendar-dragging .fc-event {
  cursor: grabbing !important;
  transform: rotate(2deg);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.fc-event-dragging {
  cursor: grabbing !important;
  opacity: 0.8;
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 拖拽时的目标日期高亮 */
.fc-daygrid-day.fc-day-today {
  background-color: rgba(64, 158, 255, 0.1) !important;
}

.fc-daygrid-day-frame:hover {
  background-color: rgba(64, 158, 255, 0.05);
}

/* 事件拖拽手柄 - 调整为矩形并缩小宽度 */
.economic-event {
  cursor: move;
  user-select: none;
  position: relative;
  transition: all 0.2s ease;
  border-radius: 4px !important;
  max-width: 120px !important;
  margin: 0 auto !important;
  overflow: hidden !important;
}

.economic-event:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.economic-event::before {
  content: "⋮⋮";
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  font-weight: bold;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.economic-event:hover::before {
  opacity: 1;
}

/* 不同重要性事件的拖拽样式 */
.economic-event-high {
  border-left: 4px solid #2c5282;
}

.economic-event-medium {
  border-left: 4px solid #b7791f;
}

.economic-event-low {
  border-left: 4px solid #2f855a;
}

/* 拖拽提示 */
.fc-event-dragging::after {
  content: "拖拽中...";
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1001;
}

/* ========== 美化后的日历主题样式 ========== */

/* 优化日历初始化和渲染 */
:deep(.fc) {
  font-family: 'Microsoft YaHei', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.12);
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%);
}

/* 初始化加载状态样式 */
:deep(.fc-loading) {
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%);
  position: relative;
}

:deep(.fc-loading::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 3px solid rgba(79, 172, 254, 0.2);
  border-top: 3px solid #4facfe;
  border-radius: 50%;
  animation: fc-spin 1s linear infinite;
}

@keyframes fc-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 日历网格容器优化 */
:deep(.fc-scrollgrid) {
  border: none !important;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  transition: none !important;
}

/* 防止初始化时布局闪烁 */
:deep(.fc-daygrid-container) {
  min-height: 600px !important;
  opacity: 1 !important;
  transition: opacity 0.3s ease !important;
}

/* 修复日期渲染问题 */
:deep(.fc-daygrid-day) {
  background: rgba(255, 255, 255, 0.95);
  transition: none !important;
  border: 1px solid rgba(79, 172, 254, 0.1) !important;
  border-radius: 8px;
  margin: 1px;
  min-height: 130px !important;
  position: relative !important;
  overflow: hidden !important;
}

:deep(.fc-daygrid-day-frame) {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  min-height: 130px !important;
  padding: 4px !important;
  box-sizing: border-box !important;
}

:deep(.fc-daygrid-day-number) {
  color: #4a5568 !important;
  font-weight: 500 !important;
  font-size: 16px !important;
  padding: 6px 8px !important;
  text-decoration: none !important;
  transition: none !important;
  border-radius: 6px;
  align-self: flex-start !important;
  margin-bottom: 4px !important;
  flex-shrink: 0 !important;
  position: relative !important;
  z-index: 2 !important;
}

:deep(.fc-daygrid-day:hover .fc-daygrid-day-number) {
  background: rgba(79, 172, 254, 0.1) !important;
}

:deep(.fc-day-today .fc-daygrid-day-number) {
  color: #4facfe !important;
  font-weight: 700 !important;
  font-size: 18px !important;
  background: rgba(79, 172, 254, 0.1) !important;
}

/* 事件容器 - 确保事件不重叠 */
:deep(.fc-daygrid-day .fc-daygrid-event-harness) {
  margin-top: auto !important;
  flex-shrink: 0 !important;
  position: relative !important;
  z-index: 1 !important;
}

/* 修复周一、周二等日期渲染问题 */
:deep(.fc-daygrid-day[aria-selected="true"]) {
  background: rgba(79, 172, 254, 0.05) !important;
}

:deep(.fc-daygrid-day.fc-day-selected) {
  background: rgba(79, 172, 254, 0.08) !important;
}

:deep(.fc-daygrid-day.fc-day-today) {
  background: rgba(79, 172, 254, 0.15) !important;
}

/* 防止初始化时样式冲突 */
:deep(.fc-theme-standard .fc-scrollgrid) {
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

/* 网格单元格统一高度 */
:deep(.fc-daygrid-day-frame) {
  /* 确保每个日期格子都有相同的高度结构 */
  contain: layout style;
}

/* 防止初始化时的布局跳变 */
:deep(.fc-daygrid-body) {
  transition: none !important;
}

:deep(.fc-daygrid-body .fc-daygrid-day) {
  transition: none !important;
}

/* 日历头部工具栏 */
:deep(.fc-header-toolbar) {
  background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
  padding: 20px 24px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 0 !important;
}

:deep(.fc-toolbar-title) {
  font-size: 28px !important;
  font-weight: 700 !important;
  color: white !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  margin: 0 !important;
}

/* 工具栏按钮 */
:deep(.fc-button) {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
  padding: 8px 16px !important;
  margin: 0 4px !important;
  transition: all 0.3s ease !important;
  backdrop-filter: blur(10px);
}

:deep(.fc-button:hover) {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

:deep(.fc-button-active) {
  background: rgba(255, 255, 255, 0.9) !important;
  color: #4facfe !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

/* 日历主体背景 */
:deep(.fc-scrollgrid) {
  border: none !important;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* 星期标题栏 */
:deep(.fc-col-header) {
  background: linear-gradient(135deg, #4facfe 0%, #00a8ff 100%);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

:deep(.fc-col-header-cell) {
  border: none !important;
  padding: 16px 0 !important;
}

:deep(.fc-col-header-cell-cushion) {
  color: white !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 日期格子 - 已优化，删除重复样式 */

/* 右侧面板背景 */
.side-panel {
  background: #f0f7ff;
  border-left: 1px solid rgba(79, 172, 254, 0.1);
}

/* 面板区域背景 */
.panel-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  margin-bottom: 20px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(79, 172, 254, 0.08);
}

/* 表单卡片背景 */
.form-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(79, 172, 254, 0.1);
  border: 1px solid rgba(79, 172, 254, 0.1);
}

/* 右侧面板背景 */

/* 事件样式 */
:deep(.fc-event) {
  border: none !important;
  border-radius: 12px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: move !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  overflow: hidden !important;
  position: relative !important;
}

:deep(.fc-event::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, currentColor, transparent);
  opacity: 0.6;
}

:deep(.fc-event:hover) {
  transform: translateY(-2px) scale(1.02) !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2) !important;
  z-index: 10 !important;
}

:deep(.fc-event-title) {
  padding: 6px 8px 4px 8px !important;
  font-weight: 600 !important;
  line-height: 1.3 !important;
  color: inherit !important;
}

:deep(.fc-event-time) {
  font-weight: 500 !important;
  opacity: 0.8 !important;
  padding: 0 8px 6px 8px !important;
  color: inherit !important;
}

/* 月视图事件 */
:deep(.fc-daygrid-event) {
  margin: 2px 4px !important;
  padding: 0 !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

/* 周视图和日视图事件 */
:deep(.fc-timegrid-event) {
  margin: 1px 4px !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-left: 4px solid #667eea !important;
}

:deep(.fc-timegrid-slot) {
  height: 3em !important;
  border-color: rgba(0, 0, 0, 0.05) !important;
}

/* 不同重要性事件的主题色彩 */
:deep(.fc-event-impact-high) {
  background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%) !important;
  border-left: 4px solid #fc8181 !important;
  color: #c53030 !important;
}

:deep(.fc-event-impact-medium) {
  background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%) !important;
  border-left: 4px solid #f6ad55 !important;
  color: #c05621 !important;
}

:deep(.fc-event-impact-low) {
  background: linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%) !important;
  border-left: 4px solid #63b3ed !important;
  color: #2a4365 !important;
}

/* 更多事件指示器 */
:deep(.fc-daygrid-more-link) {
  color: #4facfe !important;
  font-weight: 600 !important;
  padding: 4px 8px !important;
  border-radius: 6px !important;
  background: rgba(74, 172, 254, 0.1) !important;
  transition: all 0.2s ease !important;
}

:deep(.fc-daygrid-more-link:hover) {
  background: rgba(74, 172, 254, 0.2) !important;
  transform: translateY(-1px) !important;
}

/* 当前时间指示器 */
:deep(.fc-timegrid-now-indicator-line) {
  border-color: #ff6b6b !important;
  border-width: 2px !important;
  box-shadow: 0 0 8px rgba(255, 107, 107, 0.3) !important;
}

/* 拖拽反馈 */
:deep(.fc-event-dragging) {
  opacity: 0.9 !important;
  transform: rotate(2deg) scale(1.05) !important;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3) !important;
  z-index: 1000 !important;
}

/* 选中区域 */
:deep(.fc-highlight) {
  background: rgba(74, 172, 254, 0.2) !important;
  border: 2px solid #4facfe !important;
  border-radius: 8px !important;
}

/* 选择手柄 */
:deep(.fc-event-resizer-start),
:deep(.fc-event-resizer-end) {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 2px solid #4facfe !important;
  border-radius: 50% !important;
  width: 10px !important;
  height: 10px !important;
}

/* 工具提示 */
:deep(.fc-tooltip) {
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  font-size: 12px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
  backdrop-filter: blur(10px);
}

/* 响应式优化 */
@media (max-width: 768px) {
  :deep(.fc-header-toolbar) {
    flex-direction: column !important;
    gap: 12px !important;
    padding: 16px !important;
  }
  
  :deep(.fc-toolbar-chunk) {
    justify-content: center !important;
  }
  
  :deep(.fc-toolbar-title) {
    font-size: 24px !important;
    margin-bottom: 8px !important;
  }
}

/* 拖拽时的动画效果 */
@keyframes dragPulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.02);
  }

  100% {
    transform: scale(1);
  }
}

.fc-event-dragging {
  animation: dragPulse 0.6s ease-in-out infinite;
}

/* 拖拽预览覆盖层样式 */
.resize-preview-overlay {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 9999 !important;
  pointer-events: none !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

.resize-preview-container {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
}

/* 拖拽预览提示气泡 */
.resize-preview-tooltip {
  position: absolute !important;
  top: 20px !important;
  right: 20px !important;
  z-index: 10000 !important;
  pointer-events: none !important;
}

.tooltip-content {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%) !important;
  color: white !important;
  padding: 12px 16px !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  min-width: 140px !important;
  text-align: center !important;
  animation: tooltipFadeIn 0.3s ease-out !important;
}

.tooltip-title {
  font-size: 12px !important;
  font-weight: 600 !important;
  margin-bottom: 6px !important;
  opacity: 0.9 !important;
  letter-spacing: 0.5px !important;
}

.tooltip-info {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
}

.tooltip-info .duration {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #4facfe !important;
  text-shadow: 0 0 10px rgba(79, 172, 254, 0.5) !important;
}

.tooltip-info .date-range {
  font-size: 11px !important;
  opacity: 0.7 !important;
  font-weight: 500 !important;
}

.tooltip-arrow {
  position: absolute !important;
  top: -6px !important;
  right: 20px !important;
  width: 0 !important;
  height: 0 !important;
  border-left: 6px solid transparent !important;
  border-right: 6px solid transparent !important;
  border-bottom: 6px solid rgba(0, 0, 0, 0.9) !important;
}

/* 高亮覆盖区域 */
.resize-preview-highlight {
  position: absolute !important;
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%) !important;
  border: 2px dashed rgba(79, 172, 254, 0.8) !important;
  border-radius: 8px !important;
  animation: highlightPulse 1s ease-in-out infinite !important;
  pointer-events: none !important;
}

/* 拖拽提示动画 */
@keyframes tooltipFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes highlightPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(79, 172, 254, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(79, 172, 254, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(79, 172, 254, 0);
  }
}

/* 事件调整手柄增强样式 */
:deep(.fc-event-resizer-end) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
  border: 2px solid white !important;
  border-radius: 50% !important;
  width: 14px !important;
  height: 14px !important;
  box-shadow: 0 2px 8px rgba(79, 172, 254, 0.4) !important;
  cursor: ew-resize !important;
  animation: resizeHandlePulse 2s ease-in-out infinite !important;
}

:deep(.fc-event-resizer-end:hover) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  transform: scale(1.2) !important;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.6) !important;
}

@keyframes resizeHandlePulse {
  0% {
    box-shadow: 0 2px 8px rgba(79, 172, 254, 0.4);
  }
  50% {
    box-shadow: 0 2px 8px rgba(79, 172, 254, 0.8), 0 0 0 4px rgba(79, 172, 254, 0.2);
  }
  100% {
    box-shadow: 0 2px 8px rgba(79, 172, 254, 0.4);
  }
}

/* 拖拽过程中的日期高亮 */
:deep(.fc-daygrid-day-preview) {
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.2) 0%, rgba(0, 242, 254, 0.2) 100%) !important;
  border: 2px solid rgba(79, 172, 254, 0.8) !important;
  border-radius: 6px !important;
  animation: previewShimmer 1.5s ease-in-out infinite !important;
}

@keyframes previewShimmer {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
}

/* 拖拽状态提示 */
.resize-dragging-hint {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background: rgba(0, 0, 0, 0.85) !important;
  color: white !important;
  padding: 16px 24px !important;
  border-radius: 12px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  z-index: 10001 !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(20px) !important;
  animation: hintBounce 0.6s ease-out !important;
  pointer-events: none !important;
}

@keyframes hintBounce {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 成功放置事件的反馈 */
@keyframes dropSuccess {
  0% {
    transform: scale(1.1);
    background-color: #67c23a;
  }

  100% {
    transform: scale(1);
    background-color: inherit;
  }
}

.event-drop-success {
  animation: dropSuccess 0.4s ease-out;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    height: auto;
  }

  .side-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e4e7ed;
  }

  .calendar-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-left,
  .header-right {
    justify-content: center;
  }

  .impact-stats {
    justify-content: center;
  }

  /* 移动端拖拽优化 */
  :deep(.fc-event) {
    cursor: default !important;
  }
}
</style>