import { Component, ElementRef, ViewChild, Inject } from '@angular/core';
import { DataService, Racer, Tile } from './data.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DialogComponent } from './dialog'


@Component({
  selector: 'base-component',
  templateUrl: '../base.component.html',
  styleUrls: ['../base.component.css'],
})

export class BaseComponent {

  @ViewChild('wrapper') wrapper: ElementRef;

  private showDialogs: Boolean = false;
  private message = {
    prepareForRace: "Enter bets and click here to start",
    hint: "Tap, hold & drag to change terrain"
  }

  private cash: number = 100;
  private playerTitle: string = "Novice Punter";
  private dayCount: number = 1;
  private isRaceStarted: Boolean = false;
  private minBet: number = 5;

  private map: Array<Array<Tile>> = [];
  private isInit: Boolean = false;
  private isRacersInit: Boolean = false;
  private beacons: Array<Tile>;
  private intervals: Array<any> = [];

  private isInteracting: Boolean = false;
  private isFilling: Boolean = false;
  private isInteractiveMode: Boolean = true;
  private isFinishedDrawing: Boolean = false;
  private showOverlay: Boolean = true;
  private brushSize: number = 3;


  dismissOverlay() {
    this.showOverlay = false;
  }



  handleEvent(tile: Tile, event: Event) {
    console.log("handleEvent()");
    console.log("event", event);
    if (this.isInteractiveMode) {
      this.isInteracting = true
      this.isFilling = this.d.isTraversable(tile);
      this.paintTerrain(tile, this.brushSize);
    }
  }

  keepEventAlive(tile: Tile, event: any) {
    console.log(", keepEventAlive");
    console.log(". keepEventAlive");
    console.log("event", event)
    console.log("tile", tile)
    let x = tile.x;
    let y = tile.y;
    let newX = x + Math.floor(event.deltaX / 8);
    let newY = y + Math.floor(event.deltaY / 8);
    if (!this.isOutOfRange(newX, newY) && this.isInteractiveMode) {
      this.paintTerrain(this.map[newX][newY], this.brushSize);
    }
    else {
      console.log("OUT OF RANGE");
      console.log("newX", newX);
      console.log("newY", newY);
    }

  }

  eventEnd(tile, event: Event) {
    //event.stopPropagation();
    if (this.isInteractiveMode) {
      this.isInteracting = false;
      console.log("STOPPED interacting...");
    }
  }

  paintTerrain(tile, brushSize) {
    if (this.isFilling && this.isMutableTile(tile)) {
      tile.char = this.d.obstacleChars[0];
    }
    else if (this.isMutableTile(tile)) {
      tile.char = this.d.traversableChars[0];
    }
    if (brushSize > 1) {
      let adjs = this.getAdjacentTiles(tile);
      for (let key in adjs) {
        let adj = adjs[key];
        if (this.isFilling && this.isMutableTile(adj)) {
          adj.char = this.d.obstacleChars[0];
        }
        else if (this.isMutableTile(adj)) {
          adj.char = this.d.traversableChars[0];
        }
      }
    }
  }




  isMutableTile(tile) {
    return (tile.char !== this.d.indestructableChars[0] &&
      tile.char !== this.d.goalChar &&
      tile.char !== this.d.goalLineChar);
  }


  animal: string; //lab 4 dialog
  name: string;   //lab 4 dialog
  openDialog(): void {
    let dialogRef = this.dialog.open(DialogComponent, {
      width: '250px',
      data: { name: this.name, animal: this.animal, message: 'Weclome to the Racing Arena' }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.animal = result;
    });
  }

  constructor(
    private d: DataService,
    public dialog: MatDialog) {
    console.log("basecomp constr() d:", d);
    let x = 0;
    let y = 0;
    for (let row of this.d.obsMap) {
      x = 0;
      for (let char of row) {
        x++;
      }
      y++;
    }
    this.d.sizeX = x;
    this.d.sizeY = y;
    this.setupBoard();
    console.log("this.map", this.map);
    this.isRacersInit = true;
  }

  ngOnInit() {
    this.isInit = true;
  }

  ngAfterViewInit() {
    this.calculateBoardSize();
    this.wrapper.nativeElement.style.width = this.d.boardWidth + 'px'; //set width once, less buggy than [style]-binding

    console.log("this.d.racers", this.d.racers);
    if (this.showDialogs) {
      this.openDialog();
    }

  }

  ngOnDestroy() {
    this.stopLoop();
  }

  resetRace() {
    this.dayCount++;
    this.stopLoop();
    for (let racer of this.d.racers) {
      racer.component.reset();
      racer.component.placeAtStart();
      racer.isSelected = false;
    }
    this.isRaceStarted = false;
  }

  decreaseBetOn(racer) {
    if (racer.bet >= this.minBet) {
      racer.bet -= this.minBet;
      this.cash += this.minBet;
    }
  }
  increaseBetOn(racer) {
    if (this.cash >= this.minBet) {
      racer.bet += this.minBet;
      this.cash -= this.minBet;
    }
  }

  stopLoop() {
    for (let interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    console.log("interval has been cleared");
    console.log("this.intervals", this.intervals);
  }

  startLoop() {
    console.log("startLoop()");

    this.smoothenTiles();

    this.isRaceStarted = true;
    console.log("this.isRaceStarted", this.isRaceStarted);
    this.isLooping = true;
    this.stopLoop();
    let interval = setInterval(
      () => {
        if (this.isLooping) {
          this.tick();
        }
        else {
          console.log("trying to terminate loop");
          this.stopLoop();
        }
      }, this.d.loopMilliseconds);
    this.intervals.push(interval);
    console.log("after loop init, this.intervals", this.intervals);
  }



  shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  private isLooping: Boolean = false;
  private lapsToWin: number = 1;

  tick() {
    let raceIsOver = false;
    let racersRandomOrder = this.shuffle(this.d.racers.slice());
    for (let racer of racersRandomOrder) {
      if (racer.isStandingOnGoal && racer.lap === this.lapsToWin - 1) {
        this.stopLoop();
        racer.isWinner = true;
        racer.distance = -1;
        this.endRace();
      }
    }
    for (let racer of racersRandomOrder) {
      racer.act();
    }

    this.sortByShortestPath(this.d.racers);
  }

  sortByShortestPath(arr) {
    arr.sort(this.compare);
    return arr;
  }

  compare(a, b) {
    if (a.distance < b.distance)
      return -1;
    if (a.distance > b.distance)
      return 1;
    return 0;
  }

  public winnerColor: string = "black";
  endRace() {
    for (let racer of this.d.racers) {
      if (racer.isWinner) {
        racer.isSelected = true
        this.winnerColor = racer.clr;
        this.showOverlay = true;
        this.isRaceStarted = false;
        this.message.hint = racer.name + " IS THE WINNER!, you won " + (racer.bet * 2).toString() + "$"
        this.cash += racer.bet * 2;
      }
      else { racer.isSelected = false }
      racer.lap = 0;
      racer.isWinner = false;
      racer.bet = 0;
    }
  }

  putWinnerFirstIn(array, winner) {
    let arrCopy = array.slice();
    let index = arrCopy.indexOf(winner);
    if (index !== -1) {
      winner = arrCopy.splice(index, 1);
      arrCopy.unshift(winner);
    }
    else {
      throw 'index is -1, putWinnerFirstIn(...)';
    }
    return arrCopy;
  }

  logRacersComp() {
    for (let racer of this.d.racers) {
      console.log("\n racer", racer);
      if (racer.component) {
        console.log("racer.component", racer.component);
        console.log("\n ");
      }
    }
  }

  getNode(char) {
    for (let column of this.map) {
      for (let node of column) {
        if (node.char === char) {
          return node;
        }
      }
    }
  }

  getNodes(char) {
    let nodes: Array<Tile> = [];
    for (let column of this.map) {
      for (let node of column) {
        if (node.char === char) {
          nodes.push(node);
        }
      }
    }
    return nodes;
  }

  calculateBoardSize() {
    //console.log("calculateBoardSize()");
    let wrapper: HTMLDivElement = this.wrapper.nativeElement;
    let columnsNodeList = wrapper.getElementsByClassName('column');
    let columnsArray = Array.from(columnsNodeList);
    let totalWidth = 0;
    let totalHeight = columnsNodeList[0].clientHeight;
    for (let column of columnsArray) {
      let typedElem: Element = column;
      totalWidth += typedElem.clientWidth;
    }
    this.d.boardWidth = totalWidth;
    this.d.boardHeight = totalHeight;
    //console.log("this.d.boardWidth", this.d.boardWidth);
    //console.log("this.d.boardHeight", this.d.boardHeight);
  }

  getValidAdjacentTiles(tile: Tile) {
    let adjs = []
    for (let x = tile.x - 1; x <= tile.x + 1; x++) {
      for (let y = tile.y - 1; y <= tile.y + 1; y++) {
        let isSelf = (x === tile.x && y === tile.y);
        if (!isSelf &&
          !this.isOutOfRange(x, y) &&
          !this.map[x][y].isClosed &&
          this.isTraversable(this.map[x][y], tile)) {
          adjs.push(this.map[x][y]);
        }
      }
    }
    return adjs;
  }

  getAdjacentTiles(tile: Tile) {
    let adjs = []
    for (let x = tile.x - 1; x <= tile.x + 1; x++) {
      for (let y = tile.y - 1; y <= tile.y + 1; y++) {
        let isSelf = (x === tile.x && y === tile.y);
        if (!isSelf &&
          !this.isOutOfRange(x, y) &&
          !this.map[x][y].isClosed) {
          adjs.push(this.map[x][y]);
        }
      }
    }
    return adjs;
  }

  isTraversable(node, fromNode) {
    let isTraversable = !this.d.isObstacle(node);//(this.map[node.x][node.y].char !== this.d.obstacleChar);
    if (node.char === this.d.goalLineChar) {
      let isComingFromRightSide = (fromNode.x > node.x);
      if (isComingFromRightSide) { isTraversable = false }
    }
    return isTraversable;
  }

  isOutOfRange(x, y) {
    return (x < 0 || y < 0 || x >= this.d.sizeX || y >= this.d.sizeY);
  }

  tooltip(tile: Tile) {
    let summary = tile.x + " " + tile.y;
    /*
    let summary = "GHF_";
    if (tile.g_cost) { summary += `_${tile.g_cost}` };
    if (tile.h_cost) { summary += `_${tile.h_cost}` };
    if (tile.f_cost) { summary += `_${tile.f_cost}` };
    */
    return summary;
  }

  setupBoard() {
    for (let x = 0; x < this.d.sizeX; x++) {
      let column = [];
      for (let y = 0; y < this.d.sizeY; y++) {
        let char = this.d.traversableChar;
        char = this.d.obsMap[y][x];
        if (char === this.d.beaconChar) {
          let newRacer: Racer = this.d.createRacer();
          newRacer.x = x;
          newRacer.y = y;
          newRacer.clr = this.d.spliceRandomFrom(this.d.palette);
          this.d.racers.push(newRacer);
          let racerNumber = this.d.racers.indexOf(newRacer);
          if (racerNumber === -1) { throw 'RACERNUMBER -1' }
          char = this.d.traversableChar;
        }
        let root = this;

        let tile: Tile = {
          x: x,
          y: y,
          char: char,
          lastChar: (char === this.d.startChar) ? this.d.traversableChar : char,
          isOpen: false,
          isClosed: false,
          isGoal: null,
          getValidAdjacentTiles: null,
          css: {},

        }
        column.push(tile);
      }
      this.map.push(column);
    }
    this.smoothenTiles();
    this.isRacersInit = true;
  }

  smoothenTiles() {
    for (let x = 0; x < this.d.sizeX; x++) {
      for (let y = 0; y < this.d.sizeY; y++) {
        let node = this.map[x][y];
        node.css = this.setCSS(node);
      }
    }
  }

  setCSS(node) {
    let topLeft = "0%"; let topRight = "0%";
    let bottomRight = "0%"; let bottomLeft = "0%";
    let adjs = this.d.getValidAdjacents(node, this.map);
    let css = this.getCSS(node)
    return css;
  }


  getCSS(node) {
    let css: any = {}
    let topLeft = "0%"; let topRight = "0%";
    let bottomRight = "0%"; let bottomLeft = "0%";
    let adjs = this.d.getValidAdjacents(node, this.map);
    let char = (node.char === 'x') ? '.' : 'x';


    if (char === 'x') {
      if (adjs['top'] && adjs['left'] && adjs['topLeft'] &&
        adjs['top'].char === char &&
        adjs['left'].char === char &&
        adjs['topLeft'].char === char) {
        topLeft = '50%';

      }
      if (adjs['top'] && adjs['right'] && adjs['topRight'] &&
        adjs['top'].char === char &&
        adjs['right'].char === char &&
        adjs['topRight'].char === char) {
        topRight = '50%';

      }
      if (adjs['bottom'] && adjs['right'] && adjs['bottomRight'] &&
        adjs['bottom'].char === char &&
        adjs['right'].char === char &&
        adjs['bottomRight'].char === char) {
        bottomRight = '50%';

      }
      if (adjs['bottom'] && adjs['left'] && adjs['bottomLeft'] &&
        adjs['bottom'].char === char &&
        adjs['left'].char === char &&
        adjs['bottomLeft'].char === char) {
        bottomLeft = '50%';
      }
    }
    else if (char === '.') {
      if (adjs['top'] && adjs['left'] &&
        adjs['top'].char === char &&
        adjs['left'].char === char) {
        topLeft = '50%';

      }
      if (adjs['top'] && adjs['right'] &&
        adjs['top'].char === char &&
        adjs['right'].char === char) {
        topRight = '50%';

      }
      if (adjs['bottom'] && adjs['right'] &&
        adjs['bottom'].char === char &&
        adjs['right'].char === char) {
        bottomRight = '50%';

      }
      if (adjs['bottom'] && adjs['left'] &&
        adjs['bottom'].char === char &&
        adjs['left'].char === char) {
        bottomLeft = '50%';
      }
    }
    css.borderRadius = `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
    return css;
  }

}

