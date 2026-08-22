import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { WordSense } from '@vocabsprite/domain';
import {
  browserImportFields,
  inspectBrowserCsv,
  previewBrowserCsv,
  previewBrowserJsonPack,
} from '../import/browserImport';
import type { BrowserImportField, BrowserImportPreview } from '../import/browserImport';
import { downloadText, platform } from '../platform';
import { serializeBackup } from '../state/repository';
import { DAILY_NEW_LIMIT_MAX, DAILY_REVIEW_LIMIT_MAX } from '../state/model';
import type { AppState, UserPreferences } from '../state/model';

interface SettingsPageProps {
  readonly state: AppState;
  readonly onPreferences: (preferences: UserPreferences) => void;
  readonly onImport: (senses: readonly WordSense[], report: string) => void;
  readonly onRestore: (contents: string) => void;
  readonly onDeleteAll: () => void;
}

const fieldLabels: Readonly<Record<BrowserImportField, string>> = {
  lemma: '单词',
  partOfSpeech: '词性',
  senseKey: '义项键',
  definitionZh: '中文核心义',
  definitionEn: '英文释义',
  example: '英文例句',
  translation: '例句翻译',
};

const csvEscape = (value: string): string => `"${value.replaceAll('"', '""')}"`;

export function SettingsPage({
  state,
  onPreferences,
  onImport,
  onRestore,
  onDeleteAll,
}: SettingsPageProps) {
  const [importText, setImportText] = useState('');
  const [importName, setImportName] = useState('');
  const [importKind, setImportKind] = useState<'csv' | 'json'>('csv');
  const [sourceName, setSourceName] = useState('我的合法词表');
  const [sourceLicense, setSourceLicense] = useState('仅供个人使用；不主张再分发权');
  const [headers, setHeaders] = useState<readonly string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<BrowserImportField, string>>>({});
  const [preview, setPreview] = useState<BrowserImportPreview | null>(null);
  const [importError, setImportError] = useState('');
  const [deleteStep, setDeleteStep] = useState(0);
  const [clipboardStatus, setClipboardStatus] = useState('未读取');
  const [voices, setVoices] = useState<readonly SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const refresh = () =>
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter((voice) => voice.lang.toLocaleLowerCase().startsWith('en')),
      );
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) =>
    onPreferences({ ...state.preferences, [key]: value });

  const loadImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    try {
      const text = await file.text();
      const kind = file.name.toLocaleLowerCase().endsWith('.json') ? 'json' : 'csv';
      const foundHeaders = kind === 'csv' ? inspectBrowserCsv(text) : [];
      setImportText(text);
      setImportName(file.name);
      setImportKind(kind);
      setHeaders(foundHeaders);
      setMapping(
        Object.fromEntries(
          browserImportFields.map((field) => [
            field,
            foundHeaders.includes(field) ? field : '',
          ]),
        ),
      );
      setPreview(null);
      setImportError('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  const buildPreview = async () => {
    try {
      if (sourceName.trim() === '' || sourceLicense.trim() === '')
        throw new Error('必须填写来源和许可/使用权说明。');
      const result =
        importKind === 'json'
          ? await previewBrowserJsonPack(importText)
          : previewBrowserCsv(importText, `${sourceName}:${importName}`, mapping);
      const existing = new Set(state.importedSenses.map((sense) => sense.identityKey));
      const conflicts = result.senses.filter((sense) =>
        existing.has(sense.identityKey),
      ).length;
      setPreview({
        ...result,
        summary: `${result.summary} 与已有自定义内容重复 ${conflicts} 项；提交时按稳定义项 ID 合并。`,
      });
      setImportError('');
    } catch (error) {
      setPreview(null);
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  const exportLearningCsv = () => {
    const header = 'eventId,senseId,direction,feedback,reviewedAtUtc,stageAfter,reason';
    const rows = state.reviewEvents.map((event) =>
      [
        event.id,
        event.senseId,
        event.direction,
        event.feedback,
        event.reviewedAtUtc,
        event.stageAfter,
        event.reason,
      ]
        .map(csvEscape)
        .join(','),
    );
    downloadText(
      'vocabsprite-learning-records.csv',
      `${header}\n${rows.join('\n')}\n`,
      'text/csv;charset=utf-8',
    );
  };

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Local first · explicit control</p>
          <h1>设置</h1>
          <p>隐私敏感能力默认关闭；剪贴板只在明确快捷键动作之后读取。</p>
        </div>
        <span className="save-status">✓ 更改自动保存在本机</span>
      </header>
      <div className="settings-layout">
        <nav className="settings-index" aria-label="设置章节">
          <a href="#appearance">外观与动态</a>
          <a href="#attention">注意力预算</a>
          <a href="#desktop">桌面行为</a>
          <a href="#import">导入词包</a>
          <a href="#data">数据与隐私</a>
        </nav>
        <div className="settings-sections">
          <section id="appearance" className="settings-section">
            <div>
              <h2>外观与动态</h2>
              <p>系统减少动态偏好始终优先于应用设置。</p>
            </div>
            <label className="setting-row">
              <span>
                <strong>主题</strong>
                <small>浅色、深色、系统或高对比</small>
              </span>
              <select
                value={state.preferences.theme}
                onChange={(event) =>
                  update('theme', event.target.value as UserPreferences['theme'])
                }
              >
                <option value="system">跟随系统</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="contrast">高对比</option>
              </select>
            </label>
            <label className="setting-row">
              <span>
                <strong>小屏卡片大小</strong>
                <small>紧凑适合小屏，宽大适合较长释义</small>
              </span>
              <select
                value={state.preferences.compactCardSize}
                onChange={(event) =>
                  update(
                    'compactCardSize',
                    event.target.value as UserPreferences['compactCardSize'],
                  )
                }
              >
                <option value="small">紧凑</option>
                <option value="standard">标准</option>
                <option value="large">宽大</option>
              </select>
            </label>
            <label className="setting-row">
              <span>
                <strong>小屏卡片配色</strong>
                <small>高对比主题会优先使用无障碍配色</small>
              </span>
              <select
                value={state.preferences.compactCardColor}
                onChange={(event) =>
                  update(
                    'compactCardColor',
                    event.target.value as UserPreferences['compactCardColor'],
                  )
                }
              >
                <option value="violet">经典紫</option>
                <option value="blue">海盐蓝</option>
                <option value="green">薄荷绿</option>
                <option value="amber">暖杏色</option>
              </select>
            </label>
            <label className="setting-row">
              <span>
                <strong>动态词义</strong>
                <small>关闭后语义仍由文字和图景表达</small>
              </span>
              <select
                value={state.preferences.motion}
                onChange={(event) =>
                  update('motion', event.target.value as UserPreferences['motion'])
                }
              >
                <option value="off">关闭动态效果</option>
                <option value="low">低强度</option>
                <option value="standard">标准强度</option>
              </select>
            </label>
            <label className="setting-row range-setting">
              <span>
                <strong>卡片透明度</strong>
                <small>{Math.round(state.preferences.opacity * 100)}%</small>
              </span>
              <input
                type="range"
                min="0.72"
                max="1"
                step="0.01"
                value={state.preferences.opacity}
                onChange={(event) => {
                  const opacity = Number(event.target.value);
                  update('opacity', opacity);
                  void platform.setOpacity(opacity);
                }}
              />
            </label>
            <label className="switch-row compact-hint-setting">
              <span>
                <strong>想不起来时提供提示</strong>
                <small>默认关闭；开启后小屏会出现提示按钮，但不会直接给出答案</small>
              </span>
              <input
                type="checkbox"
                checked={state.preferences.hintEnabled}
                onChange={(event) => update('hintEnabled', event.target.checked)}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>英语发音声音</strong>
                <small>没有所选系统声音时自动降级到任一英语声音</small>
              </span>
              <select
                value={state.preferences.speechVoice}
                onChange={(event) => update('speechVoice', event.target.value)}
              >
                <option value="">自动选择</option>
                {voices.map((voice) => (
                  <option key={`${voice.name}:${voice.lang}`} value={voice.name}>
                    {voice.name} · {voice.lang}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-row range-setting">
              <span>
                <strong>发音语速</strong>
                <small>{state.preferences.speechRate.toFixed(1)}×</small>
              </span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={state.preferences.speechRate}
                onChange={(event) => update('speechRate', Number(event.target.value))}
              />
            </label>
          </section>
          <section id="attention" className="settings-section">
            <div>
              <h2>注意力预算</h2>
              <p>主动打开主页不受弹出预算限制。</p>
            </div>
            <div className="three-fields">
              <label>
                每日弹卡上限
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={state.preferences.dailyAppearances}
                  onChange={(event) =>
                    update('dailyAppearances', Number(event.target.value))
                  }
                />
              </label>
              <label>
                每日新词上限
                <input
                  type="number"
                  min="1"
                  max={DAILY_NEW_LIMIT_MAX}
                  value={state.preferences.dailyNewLimit}
                  onChange={(event) => update('dailyNewLimit', Number(event.target.value))}
                />
              </label>
              <label>
                每日复习上限
                <input
                  type="number"
                  min="1"
                  max={DAILY_REVIEW_LIMIT_MAX}
                  value={state.preferences.dailyReviewLimit}
                  onChange={(event) =>
                    update('dailyReviewLimit', Number(event.target.value))
                  }
                />
              </label>
            </div>
            <div className="three-fields">
              <label>
                最短间隔（分钟）
                <input
                  type="number"
                  min="5"
                  max="240"
                  value={state.preferences.minimumIntervalMinutes}
                  onChange={(event) =>
                    update('minimumIntervalMinutes', Number(event.target.value))
                  }
                />
              </label>
              <label>
                安静开始
                <input
                  type="time"
                  value={state.preferences.quietStart}
                  onChange={(event) => update('quietStart', event.target.value)}
                />
              </label>
              <label>
                安静结束
                <input
                  type="time"
                  value={state.preferences.quietEnd}
                  onChange={(event) => update('quietEnd', event.target.value)}
                />
              </label>
            </div>
            <label className="switch-row">
              <span>
                <strong>安全全屏检测</strong>
                <small>状态未知时不自动弹卡，不持续轮询</small>
              </span>
              <input
                type="checkbox"
                checked={state.preferences.fullscreenDetection}
                onChange={(event) => update('fullscreenDetection', event.target.checked)}
              />
            </label>
          </section>
          <section id="desktop" className="settings-section">
            <div>
              <h2>桌面行为</h2>
              <p>卡片显示时调用不激活窗口路径；只有点击输入框后才接收键盘输入。</p>
            </div>
            <label className="switch-row">
              <span>
                <strong>保持置顶</strong>
                <small>不等于抢夺键盘焦点</small>
              </span>
              <input
                type="checkbox"
                checked={state.preferences.topmost}
                onChange={(event) => {
                  update('topmost', event.target.checked);
                  void platform.setTopmost(event.target.checked);
                }}
              />
            </label>
            <label className="switch-row">
              <span>
                <strong>开机启动</strong>
                <small>默认关闭；更改由操作系统插件管理</small>
              </span>
              <input
                type="checkbox"
                checked={state.preferences.autoStart}
                onChange={(event) => {
                  update('autoStart', event.target.checked);
                  void platform.setAutostart(event.target.checked);
                }}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>目标保留率</strong>
                <small>由真实 FSRS 计算下次间隔</small>
              </span>
              <input
                type="number"
                min="0.7"
                max="0.97"
                step="0.01"
                value={state.preferences.targetRetention}
                onChange={(event) => update('targetRetention', Number(event.target.value))}
              />
            </label>
            <div className="shortcut-row">
              <span>
                <strong>剪贴板查词快捷键</strong>
                <small>Ctrl + Shift + V；启动前和非快捷键动作不会读取</small>
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  void platform.readClipboardAfterShortcut().then((value) => {
                    setClipboardStatus(
                      value === null
                        ? '仅原生应用支持；当前未读取'
                        : value.length === 0
                          ? '快捷键授权窗口已过期，未读取'
                          : '已在授权动作后读取（内容未写日志）',
                    );
                  });
                }}
              >
                {clipboardStatus}
              </button>
            </div>
          </section>
          <section id="import" className="settings-section import-section">
            <div>
              <h2>导入自定义词包</h2>
              <p>
                支持 CSV 列映射和 VocabSprite JSON Pack；先 dry run
                预览，再报告重复/冲突并一次性提交。不会执行文件中的 HTML 或脚本。
              </p>
            </div>
            <label className="file-drop">
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={(event) => void loadImportFile(event)}
              />
              <span>＋</span>
              <strong>{importName || '选择 CSV 文件'}</strong>
              <small>最大 5 MiB · CSV 或 schemaVersion 1 JSON</small>
            </label>
            {importKind === 'csv' && headers.length > 0 && (
              <div className="mapping-grid">
                {browserImportFields.map((field) => (
                  <label key={field}>
                    {fieldLabels[field]}
                    <select
                      value={mapping[field] ?? ''}
                      onChange={(event) =>
                        setMapping({ ...mapping, [field]: event.target.value })
                      }
                    >
                      <option value="">选择列…</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <div className="inline-fields">
              <label>
                来源名称
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                />
              </label>
              <label>
                许可/使用权说明
                <input
                  value={sourceLicense}
                  onChange={(event) => setSourceLicense(event.target.value)}
                />
              </label>
            </div>
            {importText.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void buildPreview()}
              >
                仅预览与验证
              </button>
            )}
            {importError && (
              <p className="error-box" role="alert">
                {importError}
              </p>
            )}
            {preview !== null && (
              <div className="import-preview">
                <strong>验证通过，可提交</strong>
                <p>{preview.summary}</p>
                <div className="preview-rows">
                  {preview.senses.slice(0, 5).map((sense) => (
                    <span key={sense.id}>
                      <b>{sense.lemma}</b>
                      {sense.partOfSpeech}
                      <em>{sense.definitionZh}</em>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    onImport(
                      preview.senses,
                      `${new Date().toISOString()} · ${sourceName} · ${sourceLicense} · ${preview.summary}`,
                    );
                    setPreview(null);
                    setImportText('');
                    setHeaders([]);
                  }}
                >
                  原子提交 {preview.senses.length} 个义项
                </button>
              </div>
            )}
          </section>
          <section id="data" className="settings-section danger-section">
            <div>
              <h2>数据与隐私</h2>
              <p>导出不包含系统密钥；应用当前没有遥测或后台网络请求。</p>
            </div>
            <div className="export-grid">
              <button
                type="button"
                onClick={() =>
                  downloadText('vocabsprite-backup.json', serializeBackup(state))
                }
              >
                <strong>导出全部数据</strong>
                <small>VocabSprite JSON 备份</small>
              </button>
              <button type="button" onClick={exportLearningCsv}>
                <strong>导出学习记录</strong>
                <small>UTF-8 CSV</small>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    'vocabsprite-custom-pack.json',
                    JSON.stringify(
                      {
                        schemaVersion: 1,
                        source: 'user-export',
                        senses: state.importedSenses,
                      },
                      null,
                      2,
                    ),
                  )
                }
              >
                <strong>导出自定义词包</strong>
                <small>{state.importedSenses.length} 个义项</small>
              </button>
              <label className="restore-button">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void file.text().then(onRestore);
                  }}
                />
                <strong>恢复备份</strong>
                <small>先验证 schema，再整体替换</small>
              </label>
            </div>
            <label className="switch-row">
              <span>
                <strong>允许未来网络提供器</strong>
                <small>当前实现即使开启也不会发出请求；仅记录明确选择</small>
              </span>
              <input
                type="checkbox"
                checked={state.preferences.networkOptIn}
                onChange={(event) => update('networkOptIn', event.target.checked)}
              />
            </label>
            <label className="switch-row">
              <span>
                <strong>匿名遥测</strong>
                <small>当前版本未实现遥测端点，默认关闭</small>
              </span>
              <input
                type="checkbox"
                checked={state.preferences.telemetryOptIn}
                onChange={(event) => update('telemetryOptIn', event.target.checked)}
              />
            </label>
            <div className="delete-zone">
              <div>
                <strong>删除全部个人数据</strong>
                <p>保留捆绑内容，删除复习、易混边、设置、自定义词包和本机备份状态。</p>
              </div>
              {deleteStep === 0 ? (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setDeleteStep(1)}
                >
                  开始删除…
                </button>
              ) : (
                <div className="confirm-delete">
                  <span>此操作不可撤销</span>
                  <button type="button" onClick={() => setDeleteStep(0)}>
                    取消
                  </button>
                  <button type="button" className="danger-button" onClick={onDeleteAll}>
                    确认删除全部个人数据
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
