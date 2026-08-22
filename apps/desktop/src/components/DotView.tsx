interface DotViewProps {
  readonly remaining: number;
  readonly onOpen: () => void;
  readonly onContextMenu: () => void;
}

export function DotView({ remaining, onOpen, onContextMenu }: DotViewProps) {
  return (
    <main className="dot-shell" id="main-content">
      <button
        type="button"
        className="sprite-fab"
        aria-label={`打开 VocabSprite，今日还可出现 ${remaining} 次`}
        title="打开 VocabSprite"
        onClick={onOpen}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenu();
        }}
      >
        <span>V</span>
        <small>{remaining}</small>
      </button>
    </main>
  );
}
