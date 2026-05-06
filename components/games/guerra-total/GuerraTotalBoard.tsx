// 📍 Ruta del archivo: components/games/guerra-total/GuerraTotalBoard.tsx

import type {
  GtBoardKind,
  GtCell,
  GtCellStatus,
  GtPlayerBoard,
  GtVariantTheme,
} from "./guerraTotalTypes";
import GuerraTotalCell from "./GuerraTotalCell";
import {
  getEnemyCellStatus,
  getMyCellStatus,
  getShipIconForCell,
  isCellInList,
} from "./guerraTotalUtils";
import type { GtGameState } from "./guerraTotalTypes";

type Props = {
  kind: GtBoardKind;
  title: string;
  subtitle: string;
  boardSize: number;
  gameState: GtGameState;
  theme: GtVariantTheme;
  myBoard: GtPlayerBoard | null;
  opponentBoard: GtPlayerBoard | null;
  currentPlayerKey: string | null;
  opponentKey: string | null;
  isMyTurn: boolean;
  saving: boolean;
  previewCells: GtCell[];
  previewIsValid: boolean;
  selectedShipId: string;
  onHoverCell: (cell: GtCell | null) => void;
  onPlaceShip: (cell: GtCell) => void;
  onAttack: (cell: GtCell) => void;
};

export default function GuerraTotalBoard({
  kind,
  title,
  subtitle,
  boardSize,
  gameState,
  theme,
  myBoard,
  opponentBoard,
  currentPlayerKey,
  opponentKey,
  isMyTurn,
  saving,
  previewCells,
  previewIsValid,
  selectedShipId,
  onHoverCell,
  onPlaceShip,
  onAttack,
}: Props) {
  const boardClass = kind === "mine" ? theme.mineBoardClass : theme.enemyBoardClass;

  return (
    <div className={boardClass}>
      <h2
        className={
          kind === "mine"
            ? "text-xl font-black text-cyan-200"
            : "text-xl font-black text-orange-300"
        }
      >
        {title}
      </h2>

      <p className="mt-1 text-sm text-white/50">{subtitle}</p>

      <div
        className="mt-4 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
        onMouseLeave={() => onHoverCell(null)}
      >
        {Array.from({ length: boardSize * boardSize }, (_, index) => {
          const cell = {
            row: Math.floor(index / boardSize),
            col: index % boardSize,
          };

          const realStatus =
            kind === "mine"
              ? getMyCellStatus(cell, myBoard)
              : getEnemyCellStatus({
                  cell,
                  shots: gameState.shots,
                  currentPlayerKey,
                  opponentKey,
                  opponentBoard,
                });

          const isPreviewCell =
            kind === "mine" &&
            gameState.phase === "placing" &&
            !myBoard?.ready &&
            isCellInList(cell, previewCells);

          const status: GtCellStatus = isPreviewCell
            ? previewIsValid
              ? "preview-valid"
              : "preview-invalid"
            : realStatus;

          const clickable =
            kind === "mine"
              ? gameState.phase === "placing" && !myBoard?.ready
              : gameState.phase === "battle" && isMyTurn && !!opponentKey;

          const label =
            status === "preview-valid" || status === "preview-invalid"
              ? theme.unitIcons[selectedShipId] ?? theme.icon
              : status === "ship"
                ? getShipIconForCell({ cell, board: myBoard, theme })
                : status === "hit" || status === "hit-received"
                  ? theme.hitIcon
                  : status === "sunk"
                    ? theme.sunkIcon
                    : status === "water" || status === "miss-received"
                      ? theme.missIcon
                      : theme.emptyIcon;

          return (
            <GuerraTotalCell
              key={`${cell.row}-${cell.col}`}
              cell={cell}
              status={status}
              label={label}
              theme={theme}
              clickable={clickable}
              saving={saving}
              onHover={(nextCell) => {
                if (
                  kind === "mine" &&
                  gameState.phase === "placing" &&
                  !myBoard?.ready
                ) {
                  onHoverCell(nextCell);
                }
              }}
              onClick={(nextCell) => {
                if (kind === "mine") {
                  onPlaceShip(nextCell);
                } else {
                  onAttack(nextCell);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}