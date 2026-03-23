<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  console.log("App Launch");
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