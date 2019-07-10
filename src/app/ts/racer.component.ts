import { Component, Input } from '@angular/core';
import { DataService, Racer, Tile } from './data.service';

@Component({
  selector: 'racer-component',
  templateUrl: '../racer.component.html',
  styleUrls: ['../racer.component.css'],
})

export class RacerComponent {

  @Input('racer') racer: Racer;
  @Input('map') map: Array<Array<Tile>>;

  private myMap: Array<Array<Tile>>;

  private isInit: Boolean = false;
  private startX: number;
  private startY: number;
  private goalX: number;
  private goalY: number;
  private opened: Array<Tile> = [];
  private closed: Array<Tile> = [];
  private pathIsFound: Boolean = false;
  private shortestPath: Array<Tile>;
  private lastPath: Array<Tile>;

  constructor(private d: DataService) { }

  private transitionTiming: string = 'linear';


  isDestroyWallAble(): Boolean {

    console.log("check()")
    let node = this.map[this.racer.x][this.racer.y];
    let adjs = this.d.getValidAdjacents(node, this.map);

    //first pick one 'x' neighb at random...
    let adjsOnlyObstacles = []
    for (let key in adjs) {
      if (this.d.isObstacle(adjs[key]) && !this.d.isIndestructable(adjs[key])) {
        adjsOnlyObstacles.push(adjs[key])
      }
    }
    if (adjsOnlyObstacles.length === 0) { return false }

    console.log("adjsOnlyObstacles", adjsOnlyObstacles)

    let pick = this.d.pickRandomFrom(adjsOnlyObstacles);
    console.log("pick", pick)
    pick.char = this.d.traversableChars[0];


    return true;
  }


  isCreateWallAble() {

    console.log("isCreateWallAble()")
    let node = this.map[this.racer.x][this.racer.y];
    if (!this.d.isTraversable(node)) { return false }

    let adjs = this.d.getValidAdjacents(node, this.map);

    let blocked1 = (
      !adjs['topLeft'] || !adjs['bottomRight'] ||
      (this.d.isObstacle(adjs['topLeft']) &&
        this.d.isObstacle(adjs['bottomRight']))
    );
    let blocked2 = (
      !adjs['top'] || !adjs['bottom'] ||
      (this.d.isObstacle(adjs['top']) &&
        this.d.isObstacle(adjs['bottom']))
    );
    let blocked3 = (
      !adjs['topRight'] || !adjs['bottomLeft'] ||
      (this.d.isObstacle(adjs['topRight']) &&
        this.d.isObstacle(adjs['bottomLeft']))
    );
    let blocked4 = (
      !adjs['right'] || !adjs['left'] ||
      (this.d.isObstacle(adjs['right']) &&
        this.d.isObstacle(adjs['left']))
    );

    if (!blocked1 && !blocked2 && !blocked3 && !blocked4) {
      node.char = this.d.obstacleChars[0];
      console.log("created a wall")
    }

    //console.log("adjs", adjs);
    return true;
  }

  isTackleAble(){
    console.log("\n")
    console.log("isTackleAble()");
    let node = this.map[this.racer.x][this.racer.y];
    let rivals = [];
    let nodesOccupiedByRivals = [];
    for (let racer of this.d.racers) {
      let isSelf = (this.racer === racer);
      if (!isSelf) {
        nodesOccupiedByRivals.push(this.map[racer.x][racer.y]);
        rivals.push(racer)
      }
    }
    console.log("nodesOccupiedByRivals", nodesOccupiedByRivals);
    console.log("rivals", rivals)
    let validTargets = [];
    let adjs = this.d.getValidAdjacents(node, this.map);
    for (let key in adjs) {
      let adj = adjs[key];
      if (nodesOccupiedByRivals.indexOf(adj) !== -1) {
        //match
        console.log("isTackleAble() found match");
        validTargets.push(adj);
      }
    }
    if (validTargets.length === 0) {console.log("NO MATCH \n");console.log("\n");return false}

    let pick = this.d.pickRandomFrom(validTargets);

    let index = nodesOccupiedByRivals.indexOf(pick);
    rivals[index].isStunned = true;
    console.log("!!!!! STUNNED !!!!!");
    console.log("\n")

  }

  ngOnInit() {
    this.myMap = this.cloneMap(this.map);
    this.racer.component = this;

    //ACT
    this.racer.act = () => {

      if (this.racer.isStunned) {
        this.racer.isStunned = Math.random() >= 0.5;
        return;
      }

      this.reset();
      this.prepareToFindPath();
      let stepSize = this.d.pickRandomFrom(this.racer.die);
      //ABILITY GATES
      if (stepSize === 'destroy wall') {
        let isAble = this.isDestroyWallAble();
        if (isAble) {
          return;
        }
        let stepSize = this.d.pickRandomFrom(this.racer.primitiveDie);
      }
      if (stepSize === 'create wall') {
        let isAble = this.isCreateWallAble();
        if (isAble) {
          return;
        }
        let stepSize = this.d.pickRandomFrom(this.racer.primitiveDie);
      }
      if (stepSize === 'tackle') {
        let isAble = this.isTackleAble();
        if (isAble) {
          return;
        }
        let stepSize = this.d.pickRandomFrom(this.racer.primitiveDie);
      }
      console.log("this.shortestPath", this.shortestPath);
      if (this.shortestPath) {
        console.log("Act() moveStep()");
        this.move(this.shortestPath, stepSize);
        this.racer.distance = this.shortestPath.length;
      }
      else if (this.lastPath && this.lastPath.length > 1) {
        console.log("Act() backupplan");
        this.move(this.lastPath, stepSize);
        this.racer.distance = this.lastPath.length;
      }
      else {
        console.log("Act() Nothing");
        this.racer.distance = 999;
      }
    }
    let x = this.racer.x;
    let y = this.racer.y;
    this.startX = x;
    this.startY = y;
    this.map[x][y].char = this.d.traversableChar;
    this.map[x][y].lastChar = this.d.traversableChar;
    this.isInit = true;
    this.reset();
    this.prepareToFindPath();
  }

  prepareToFindPath() {
    let startNode = this.myMap[this.racer.x][this.racer.y];
    startNode.g_cost = 0;
    this.opened.push(startNode);
    let goal = this.d.pickRandomFrom(this.getNodes(this.d.goalChar));
    this.goalX = goal.x;
    this.goalY = goal.y;
    this.shortestPath = this.aStar();
    if (this.shortestPath && this.shortestPath.length > 0) {
      this.shortestPath.reverse();
    }
  }

  placeAtStart() {
    this.racer.x = this.startX;
    this.racer.y = this.startY;
  }

  getNode(char) {
    for (let column of this.myMap) {
      for (let node of column) {
        if (node.char === char) {
          return node;
        }
      }
    }
  }

  getNodes(char) {
    let nodes = [];
    for (let column of this.myMap) {
      for (let node of column) {
        if (node.char === char) {
          nodes.push(node);
        }
      }
    }
    return nodes;
  }

  move(path, stepSize) {
    //let path = this.shortestPath || this.lastPath;
    //let stepSize = this.d.pickRandomFrom(this.racer.die);

    let fromNode = path.splice(0, 1)[0];
    let dest;
    let isBlocked: Boolean = false;

    if (fromNode.char === this.d.goalChar) {
      dest = this.getAdjGoalLine(fromNode);
      if (dest === undefined) { return }
      this.stepTo(dest, fromNode);
      this.racer.isStandingOnGoal = true;
      return;
    }
    else if (fromNode.char === this.d.goalLineChar) {
      dest = this.validNodeAfterGoal(fromNode);
      if (dest === undefined) { return }
      this.stepTo(dest, fromNode);
      this.racer.lap++;
      return;
    }
    else if (path.length > 0) {

      let n = Math.min(stepSize, path.length);
      let nodes = path.slice(0, n);//slice v splice, splice changes array
      dest = this.getFirstValidFromEnd(nodes, fromNode);
      if (dest === undefined) { return }
      let index = path.indexOf(dest);
      if (index !== -1) {
        path.splice(0, index); //update path
      }
      if (dest === undefined || fromNode === undefined) {
        console.log("somethings off");
      }
      this.stepTo(dest, fromNode);
    }
  }

  getFirstValidFromEnd(nodes: Array<any>, fromNode) {
    nodes.reverse();
    for (let node of nodes) {
      let isValidNode = this.isTraversable(node, fromNode, true);
      if (isValidNode) {
        return node;
      }
    }
  }

  stepTo(toNode, fromNode) {
    this.racer.x = toNode.x;
    this.racer.y = toNode.y;
  }

  validNodeAfterGoal(fromNode) {
    let node = undefined;
    for (let x = fromNode.x - 1; x <= fromNode.x + 1; x++) {
      for (let y = fromNode.y - 1; y <= fromNode.y + 1; y++) {
        let isSelf = (x === fromNode.x && y === fromNode.y);
        if (!isSelf &&
          !this.isOutOfRange(x, y) &&
          this.myMap[x][y].char !== this.d.goalLineChar &&
          this.isTraversable(this.myMap[x][y], fromNode, true) &&
          x > fromNode.x) {
          let newCandidate = this.myMap[x][y];
          newCandidate.dist = this.distBetweenAdjacent(fromNode, newCandidate);
          if (node === undefined || newCandidate.dist < node.dist) {
            node = newCandidate;
          }
        }
      }
    }
    return node;
  }

  cloneMap(map) {
    let newMap = JSON.parse(JSON.stringify(map));
    return newMap;
  }

  reset() {

    this.myMap = this.cloneMap(this.map);

    let keepTransitionType = (Math.floor(Math.random() * 9));
    if (!keepTransitionType) {
      this.transitionTiming = this.d.pickRandomFrom(this.racer.transitionsTypes);
    }

    this.racer.isStandingOnGoal = false;
    this.opened = [];
    this.closed = [];
    if (this.shortestPath) {
      this.lastPath = this.shortestPath;
    }
    this.shortestPath = undefined;
    let node = undefined;
    for (let x = 0; x < this.d.sizeX; x++) {
      for (let y = 0; y < this.d.sizeY; y++) {
        let node = this.myMap[x][y];
        node.g_cost = undefined;
        node.h_cost = undefined;
        node.f_cost = undefined;
        node.cameFrom = undefined;
        node.isClosed = undefined;
        node.isOpen = undefined;
        node.isGoal = () => {
          return (node.char === this.d.goalChar);
        }
        node.getValidAdjacentTiles = () => {
          return this.getValidAdjacentTiles(node);
        }

      }
    }
  }



  aStar() {
    while (this.opened.length > 0) {
      //console.log("aStar() this.opened.length", this.opened.length)

      //current := the node in openSet having the lowest f_cost value, 
      //d.beaconChar that lowest h_cost, 
      //pick one random if tie
      let currentNode = this.pick();

      //if current = goal
      //  return reconstruct_path(cameFrom, current)
      if (currentNode.isGoal()) {
        this.pathIsFound = true;
        let thePath = this.reconstructPath(currentNode, []);
        return thePath;//we should return the path
      }

      this.moveFromOpenToClosed(currentNode);

      //for each neighbor of current
      let neighbNodes = currentNode.getValidAdjacentTiles();

      //console.log("neighbNodes", neighbNodes);
      for (let node of neighbNodes) {
        // Discover a new node
        if (!node.isOpen) {
          node.cameFrom = currentNode;
          node.isOpen = true;
          this.opened.push(node);
        }

        let someG = currentNode.g_cost + this.distBetweenAdjacent(node, currentNode)
        if (!node.g_cost || !node.h_cost || !node.f_cost) {
          node.g_cost = someG;
          node.h_cost = this.heuristicCostEstimate({ x: this.goalX, y: this.goalY }, node);
          node.f_cost = node.g_cost + node.h_cost;
        }
        if (someG < node.g_cost) {
          node.cameFrom = currentNode;
          node.g_cost = someG;
          node.f_cost = node.g_cost + node.h_cost;
        }
      }
    }
    console.log("! there is no valid path ! racer", this.racer);
  }

  getAdjGoalLine(fromNode) {
    let node = undefined;
    for (let x = fromNode.x - 1; x <= fromNode.x + 1; x++) {
      for (let y = fromNode.y - 1; y <= fromNode.y + 1; y++) {
        let isSelf = (x === fromNode.x && y === fromNode.y);
        if (!isSelf &&
          !this.isOutOfRange(x, y) &&
          this.isTraversable(this.myMap[x][y], fromNode, false) &&
          this.myMap[x][y].char === this.d.goalLineChar) {
          let newCandidate = this.myMap[x][y];
          newCandidate.dist = this.distBetweenAdjacent(fromNode, newCandidate);
          if (node === undefined || newCandidate.dist < node.dist) {
            node = newCandidate;
          }
        }
      }
    }
    return node;
  }

  reconstructPath(tile: Tile, path) {
    tile.isPath = true;
    path.push(tile);
    if (tile.cameFrom) {
      path = this.reconstructPath(tile.cameFrom, path);
    }
    return path;
  }

  getValidAdjacentTiles(tile: Tile) {
    let adjs = []
    for (let x = tile.x - 1; x <= tile.x + 1; x++) {
      for (let y = tile.y - 1; y <= tile.y + 1; y++) {
        let isSelf = (x === tile.x && y === tile.y);
        if (!isSelf &&
          !this.isOutOfRange(x, y) &&
          !this.myMap[x][y].isClosed &&
          this.isTraversable(this.myMap[x][y], tile, true)) {
          adjs.push(this.myMap[x][y]);
        }
      }
    }
    return adjs;
  }

  isTraversable(node, fromNode, respectRacers: Boolean) {

    //check for obstacles
    let isTraversable = !this.d.isObstacle(node)//(this.myMap[node.x][node.y].char !== this.d.obstacleChar);

    //check for goalLine
    if (node.char === this.d.goalLineChar) {
      //'>' is not allowed to enter from right side, 
      //like the arrow indicates
      let allowedAngle = (fromNode.x > node.x);
      if (allowedAngle) { isTraversable = false }
    }

    //check for other blocking racers
    //let dx = Math.abs(node.x-this.racer.x);
    //let dy = Math.abs(node.y-this.racer.y);
    //let isJustBesideMe = (dx <= 1 && dx <= 1);
    if (respectRacers) {
      let isBlocked = this.isBlocked(this.racer, node);
      if (isBlocked) { return false; }
    }

    return isTraversable;
  }

  isBlocked(forRacer, node) {
    for (let racer of this.d.racers) {
      if (racer !== this.racer &&
        racer.x === node.x &&
        racer.y === node.y)
        return true;
    }
  }

  heuristicCostEstimate(start, dest) {
    //h = min(dx, dy) * 14 + abs(dx - dy) * 10
    let dx = Math.abs(start.x - dest.x);
    let dy = Math.abs(start.y - dest.y);
    let p1 = Math.min(dx, dy) * 14;
    let p2 = Math.abs(dx - dy) * 10;
    return p1 + p2;
  }

  distBetweenAdjacent(start, dest) {
    let cost = 10;
    let isDiagonal = (start.x !== dest.x && start.y !== dest.y);
    if (isDiagonal) { cost = 14 }
    return cost;
  }

  moveFromOpenToClosed(tile: Tile) {
    let index = this.opened.indexOf(tile);
    tile = this.opened.splice(index, 1)[0];
    tile.isOpen = false;
    tile.isClosed = true;
    this.closed.push(tile);
  }

  pick() {
    let pick = this.opened[0];
    for (let tile of this.opened) {
      if (tile.f_cost < pick.f_cost) {
        pick = tile;
      }
      else if (tile.f_cost === pick.f_cost) {
        if (tile.h_cost < pick.h_cost) {
          pick = tile;
        } else {
          pick = [pick, tile][Math.floor(Math.random() * 2)];
        }
      }
    }
    return pick;
  }

  calcG(tile: Tile, cost) {
    if (tile.char !== this.d.startChar && tile.cameFrom) {
      cost += tile.cameFrom.g_cost;
      this.calcG(tile.cameFrom, cost);
    }
    return cost;
  }

  getParent(tile) {
    let adjs: Array<Tile> = this.getOpenedAdjs(tile);
    if (adjs.length) {
      let cheapestParent = adjs[0];
      for (let adj of adjs) {
        if (adj.f_cost < cheapestParent.f_cost) {
          cheapestParent = adj;
        }
      }
      return cheapestParent;
    }
    return null;
  }

  getOpenedAdjs(tile: Tile) {
    let adjs = [];
    for (let x = tile.x - 1; x <= tile.x + 1; x++) {
      for (let y = tile.y - 1; y <= tile.y + 1; y++) {
        if (!this.isOutOfRange(x, y) && this.myMap[x][y].isOpen) {
          adjs.push(this.myMap[x][y]);
        }
      }
    }
    return adjs;
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

  logPath() {
    console.log("this.shortestPath", this.shortestPath);
  }

  getHtmlX(x) {
    let xResult = ((this.racer.x * x)) + -1 + 'px';
    return xResult;
  }
  getHtmlY(y) {
    let yResult = ((this.racer.y * y)) + -2 + 'px';
    return yResult;
  }

  //bottom
}