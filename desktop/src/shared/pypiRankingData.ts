import { PackageRanking } from './pypiRanking';

/** PyPI 近 30 天下载量参考榜 (pypistats.org, 2026-11-20 实测)。
 *  应用内打开榜单时会尝试实时刷新; 离线时使用此快照。 */
export const BUNDLED_RANKING: PackageRanking = {
  source: 'bundled',
  fetched_at: '2026-11-20T00:00:00Z',
  packages: [
  { name: 'requests', category: 'Web', monthly: 1509587786 },
  { name: 'cryptography', category: '安全', monthly: 1383938437 },
  { name: 'pyyaml', category: '工具', monthly: 1273217837 },
  { name: 'pydantic', category: 'Web', monthly: 1177847368 },
  { name: 'click', category: '工具', monthly: 1137837149 },
  { name: 'numpy', category: '科学计算', monthly: 1119620734 },
  { name: 'pytest', category: '测试', monthly: 989918084 },
  { name: 'jinja2', category: 'Web', monthly: 723903609 },
  { name: 'pandas', category: '数据处理', monthly: 712925236 },
  { name: 'pillow', category: '图像处理', monthly: 712134094 },
  { name: 'aiohttp', category: '异步', monthly: 567015434 },
  { name: 'fastapi', category: 'Web', monthly: 551942254 },
  { name: 'tqdm', category: '工具', monthly: 502488008 },
  { name: 'sqlalchemy', category: '数据库', monthly: 419853525 },
  { name: 'scipy', category: '科学计算', monthly: 395096300 },
  { name: 'openpyxl', category: '数据处理', monthly: 368190954 },
  { name: 'networkx', category: '科学计算', monthly: 283119910 },
  { name: 'scikit-learn', category: '机器学习', monthly: 215811559 },
  { name: 'flask', category: 'Web', monthly: 209131790 },
  { name: 'matplotlib', category: '可视化', monthly: 199959218 },
  { name: 'sympy', category: '科学计算', monthly: 170689089 },
  { name: 'transformers', category: '机器学习', monthly: 120882484 },
  { name: 'plotly', category: '可视化', monthly: 60695866 },
  { name: 'torch', category: '机器学习', monthly: 59336090 },
  { name: 'statsmodels', category: '科学计算', monthly: 41156936 },
  { name: 'h5py', category: '数据处理', monthly: 34897854 },
  { name: 'opencv-python', category: '图像处理', monthly: 34467225 },
  { name: 'xgboost', category: '机器学习', monthly: 32820838 },
  { name: 'seaborn', category: '可视化', monthly: 31691588 },
  { name: 'lightgbm', category: '机器学习', monthly: 23929669 },
  { name: 'tensorflow', category: '机器学习', monthly: 12374104 },
  ]
};
