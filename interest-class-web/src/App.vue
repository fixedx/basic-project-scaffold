<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { getToken } from "@/utils/auth";

onLaunch(() => {
  console.log("App Launch");
  
  // 检查登录状态和用户类型，自动跳转到对应首页
  const token = getToken();
  const userType = uni.getStorageSync('userType');
  
  // 生产环境不输出敏感信息
  // #ifdef DEV
  console.log('Token:', token ? '存在' : '无');
  console.log('UserType:', userType);
  // #endif
  
  // 获取当前页面路径
  const pages = getCurrentPages();
  const currentPage = pages.length > 0 ? pages[0].route : '';
  console.log('当前页面:', currentPage);
  
  // 如果已登录且有用户类型，跳转到对应首页
  if (token && userType) {
    // 如果当前是家长端首页，但用户是机构/教师/管理员，则跳转
    if (currentPage === 'pages/index/index' || currentPage === '') {
      if (userType === 'institution') {
        console.log('机构用户，跳转到机构中心');
        uni.reLaunch({ url: '/pages/institution/center/index' });
        return;
      } else if (userType === 'teacher') {
        console.log('教师用户，跳转到教师中心');
        uni.reLaunch({ url: '/pages/teacher/center/index' });
        return;
      } else if (userType === 'admin') {
        console.log('管理员用户，跳转到管理中心');
        uni.reLaunch({ url: '/pages/admin/center/index' });
        return;
      }
    }
  }
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>
<style>
/* 全局引入 iconfont 样式 */
@import "@/static/iconfont/iconfont.css";
/* 全局公共样式 */
@import "@/common.scss";
</style>

