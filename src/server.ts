import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { runAutoActivities } from '@/lib/ai-activity';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

const AGENT_SCHEDULE_INTERVAL_MS = 5 * 60 * 1000; // 每 5 分钟检查一次

/**
 * 启动 AI 自主活跃调度（单向全局守卫，避免 dev HMR 重复注册）。
 * 每个 AI 账号内部按冷却时间自我决定是否写日记/留言/回复，天然防刷屏。
 * 任何异常都不会影响主服务。
 */
function startAiScheduler() {
  const g = globalThis as unknown as { __aiSchedulerStarted?: boolean };
  if (g.__aiSchedulerStarted) return;
  g.__aiSchedulerStarted = true;

  let running = false;
  const tick = async (firstRun: boolean) => {
    if (running) return;
    running = true;
    try {
      // 首轮 + 每轮都确保 AI 账号已播种
      const { log } = await runAutoActivities({});
      if (log.length) {
        console.log(`[AI调度] ${firstRun ? '首轮' : '周期'}执行: ${log.join(' | ')}`);
      }
    } catch (err) {
      console.error('[AI调度] 异常(已忽略):', err);
    } finally {
      running = false;
    }
  };

  // 服务就绪后延迟 8s 首轮执行，以便数据库/播种就绪
  setTimeout(() => void tick(true), 8000);
  setInterval(() => void tick(false), AGENT_SCHEDULE_INTERVAL_MS);
  console.log('[AI调度] 已启动，间隔', AGENT_SCHEDULE_INTERVAL_MS / 1000, '秒');
}

// Create Next.js app
const app = next({ dev, hostname, port, webpack: true });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  startAiScheduler();
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});
