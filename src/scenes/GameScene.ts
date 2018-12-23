class GameScene extends egret.DisplayObjectContainer {

    private static GAP  = 12;

    private static CELL_SIZE = 65;

    private static CELL_ELLIPSE = 12;

    private cellArr = new Array<Array<Cell>>();

    private cellContainer: egret.DisplayObjectContainer;

    private selectedCellShape: egret.Shape;

    private selectedRowAndCol: Array<{ row: number, col: number }>;

    // 当前关卡
    private curLevel = 1;

    constructor(private _levelJson: Array<Array<Array<number>>>) {
        super();
        this.addEventListener(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this);
    }

    private onAddToStage() {
        this.removeEventListener(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this);
        this.drawCell();
    }

    private drawCell() {
        this.selectedRowAndCol = new Array<{ row: number, col: number }>();
        if (!this.cellContainer) {
            this.cellContainer = new egret.DisplayObjectContainer();
        }
        let cell: Cell = null;
        for (let row = 0; row < this.cellArr.length; row++) {
            for (let col = 0; col < this.cellArr[0].length; col++) {
                cell = this.cellArr[row][col];
                cell.removeEventListener(CellEvent.ADD_2_ARR, this.onAddCell2Arr, this);
                cell.removeEventListener(CellEvent.TRY_2_ADD_2_ARR, this.onTry2AddCell2Arr, this);
                this.cellContainer.removeChild(cell);
            }
        }
        this.cellArr.length = 0;

        const cellJson: Array<Array<number>> = this._levelJson[this.curLevel - 1];
        const rows = cellJson.length;
        const cols = cellJson[0].length;
        for (let row = 0; row < rows; row++) {
            this.cellArr[row] = new Array<Cell>();
            for (let col = 0; col < cols; col++) {
                cell = new Cell(row, col, GameScene.CELL_SIZE, GameScene.CELL_ELLIPSE, cellJson[row][col]);
                cell.x = col * (cell.width + GameScene.GAP);
                cell.y = row * (cell.height + GameScene.GAP);
                this.cellContainer.addChild(cell);
                this.cellArr[row][col] = cell;
                cell.addEventListener(CellEvent.ADD_2_ARR, this.onAddCell2Arr, this);
                cell.addEventListener(CellEvent.TRY_2_ADD_2_ARR, this.onTry2AddCell2Arr, this);

                if (cellJson[row][col] === 2) {
                    // 起点
                    this.selectedRowAndCol.push({ row, col });
                }
            }
        }
        this.cellContainer.x = (this.stage.stageWidth - this.cellContainer.width) / 2;
        this.cellContainer.y = 300;
        if (this.cellContainer.parent !== this) {
            this.addChild(this.cellContainer);
        }

        if (!this.selectedCellShape) {
            this.selectedCellShape = new egret.Shape();
            this.cellContainer.addChild(this.selectedCellShape);
        } else {
            this.cellContainer.setChildIndex(this.selectedCellShape, this.cellContainer.numChildren + 1);
        }
        this.drawSelectedCell();
    }

    private drawSelectedCell() {
        let row: number = -1;
        let col: number = -1;
        let nextRow: number = -1;
        let nextCol: number = -1;
        let startRow: number = -1;
        let startCol: number = -1;
        const lineArr = new Array<{ startRow: number, endRow: number, startCol: number, endCol: number }>();
        //  上一段线的防线，-1是没有方向，0是水平方向，1是垂直方向
        let lastDir = -1;
        for (let index = 0; index < this.selectedRowAndCol.length; index++) {
            row = this.selectedRowAndCol[index].row;
            col = this.selectedRowAndCol[index].col;
            if (index === 0) {
                startRow = row;
                startCol = col;
            }
            if (index < this.selectedRowAndCol.length - 1) {
                nextRow = this.selectedRowAndCol[index + 1].row;
                nextCol = this.selectedRowAndCol[index + 1].col;
                if (lastDir === -1) {
                    lastDir = nextRow === row ? 0 : 1;
                } else {
                    if (nextRow === row) {
                        // 这次是水平的，看看之前的方向
                        if (lastDir === 1) {
                            // 之前的是垂直的，那就算是得到了一个线段
                            lineArr.push({
                                startRow,
                                startCol,
                                endRow: row,
                                endCol: col,
                            });
                            startRow = row;
                            startCol = col;
                        }
                        lastDir = 0;
                    } else {
                        // 这是是垂直的了，
                        if (lastDir === 0) {
                            lineArr.push({
                                startRow,
                                startCol,
                                endRow: row,
                                endCol: col,
                            });
                            startRow = row;
                            startCol = col;
                        }
                        lastDir = 1;
                    }
                }
            } else {
                lineArr.push({
                    startRow,
                    startCol,
                    endRow: row,
                    endCol: col,
                });
            }
        }

        const gap = GameScene.GAP;
        const cellSize = GameScene.CELL_SIZE;
        const g = this.selectedCellShape.graphics;
        g.clear();
        g.beginFill(0x18cfdb);
        let minRow: number = 0;
        let minCol: number = 0;
        let maxRow: number = 0;
        let maxCol: number = 0;
        for (let index = 0; index < lineArr.length; index++) {
            let { startRow, startCol, endRow, endCol } = lineArr[index];
            if (startRow === endRow) {
                minRow = startRow;
                maxRow = endRow;
                // 水平画线
                if (startCol > endCol) {
                    minCol = endCol;
                    maxCol = startCol;
                } else {
                    minCol = startCol;
                    maxCol = endCol;
                }
            } else {
                minCol = startCol;
                maxCol = endCol;
                if (startRow > endRow) {
                    minRow = endRow;
                    maxRow = startRow;
                } else {
                    minRow = startRow;
                    maxRow = endRow;
                }
            }
            g.drawRoundRect(
                minCol * (cellSize + gap),
                minRow * (cellSize + gap),
                (maxCol - minCol) * gap + (maxCol - minCol + 1) * cellSize,
                (maxRow - minRow) * gap + (maxRow - minRow + 1) * cellSize,
                GameScene.CELL_ELLIPSE,
            );
        }
        g.endFill();

        // 判断是不是成功了
        const cellJson: Array<Array<number>> = this._levelJson[this.curLevel - 1];
        const rows = cellJson.length;
        const cols = cellJson[0].length;
        let exists: boolean = false;
        let success: boolean = true;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (cellJson[row][col] > 0) {
                    exists = false;
                    for (let index = 0; index < this.selectedRowAndCol.length; index++) {
                        if (this.selectedRowAndCol[index].row === row) {
                            if (this.selectedRowAndCol[index].col === col) {
                                exists = true;
                                break;
                            }
                        }
                    }
                    if (!exists) {
                        // 只要有一个不在，那就是失败的
                        success = false;
                    }
                }
                if (!success) {
                    break;
                }
            }
            if (!success) {
                break;
            }
        }
        if (success) {
            // 成功了，跳到下一关
            const t: number = setTimeout(() => {
                clearTimeout(t);
                if (++this.curLevel > this._levelJson.length) {
                    // 所有的关卡都通过了。。。
                } else {
                    this.drawCell();
                }
            }, 200);
        }
    }

    private onTry2AddCell2Arr(evt: CellEvent) {
        const { row, col } = evt;
        const l = this.selectedRowAndCol.length;
        for (let index = 0; index < l; index++) {
            if (this.selectedRowAndCol[index].row === row) {
                if (this.selectedRowAndCol[index].col === col) {
                    this.selectedRowAndCol.splice(index, l - index);
                    this.selectedRowAndCol.push({ row, col });
                    this.drawSelectedCell();
                    return;
                }
            }
        }
        // 添加的必须和上一个是连续的
        if (l > 0) {
            const lastRow = this.selectedRowAndCol[l - 1].row;
            const lastCol = this.selectedRowAndCol[l - 1].col;
            if (Math.abs(lastRow - row) + Math.abs(lastCol - col) === 1) {
                this.selectedRowAndCol.push({ row, col });
                this.drawSelectedCell();
            }
        }
    }

    private onAddCell2Arr(evt: CellEvent) {
        const { row, col } = evt;
        const l = this.selectedRowAndCol.length;
        // 添加的必须和上一个是连续的
        if (l > 0) {
            const lastRow = this.selectedRowAndCol[l - 1].row;
            const lastCol = this.selectedRowAndCol[l - 1].col;
            if (Math.abs(lastRow - row) + Math.abs(lastCol - col) !== 1) {
                return;
            }
        }
        for (let index = 0; index < l; index++) {
            if (this.selectedRowAndCol[index].row === row) {
                if (this.selectedRowAndCol[index].col === col) {
                    return;
                }
            }
        }
        this.selectedRowAndCol.push({ row, col });
        this.drawSelectedCell();
    }
}