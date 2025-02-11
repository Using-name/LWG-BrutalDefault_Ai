//BrutalDefault - a LWG AI created by Brutalitywarlord
//This Variant of the Ai works only for default maps
//Its behavior can vary by slight margins dependant on modifiers determined from the start of the gameclock
//As a result of increased dependancy on RNG - this bot is more versatile, and variable in its behavior
//Than the current default AI for LWG - although this current iteration still struggles to defeat the current model.




//Initialization scope - sets variables for use in behavioural augmentations
if(!scope.initialized){
	//generates a randomized multiplier to determine variable behavior in the computer
	//"OopsOnlyTowers" - Disabled Metas due to issues
	scope.meta = ["Rax","BeastMech","Beast","RaxMech", "Skirmishers",];
	scope.goldAlert = false; //Will stop building structures if goldmine running empty - prioritizes a new castle. 
	scope.castPrio = false; //Determines if the bot avoids building anything before 2nd castle is built
	scope.strategy = scope.meta[Random(scope.meta.length)]; //Determines the variant of the meta the bot will use. 
	scope.atkDelay = 180;
	scope.medianAtk = 180;//when the AI tilts, it uses this as a center point to tilt either way
	
	scope.aggression = randBehavior(50, 101);//Controls the interval for aggresive actions
	scope.frugal = randBehavior(100, 26);//Controls how much money the Computer wants to save
	scope.expansion = randBehavior(50, 101);//Controls the interval for most building construction
	scope.defensive = randBehavior(30, 121);//Controls interval for defensive actions
	scope.rshPrio = randBehavior(10, 141);//Controls how often the computer will research new technology
	scope.playNum = scope.getArrayOfPlayerNumbers();
	scope.playStarts = [];
	scope.chatter = ( 60 + Random(300));
	for (var yee = 0; yee < scope.playNum.length; yee++){
		scope.playStarts[yee] = scope.getStartLocationForPlayerNumber(scope.playNum[yee]);
	}
	scope.plentyGold = false;
	//Variable controls delays seen in a few build orders
	//Array Order: Houses, Forge
	scope.delay = [10,10];
	
	//Determines how the Ai prioritizes a second castle
	var prioChoice = Random(100);
	if(prioChoice >= 85){
		scope.castPrio = true;
	}
	
	scope.alertDelay = 10;
	scope.towerControl = 40;
	scope.scoutControl = 60;
	scope.castleRush = 3;
	scope.castleSwitch = false;
	scope.cLimit = 2;

	//Logs all the behavioral variables in the console.
	console.log("Player: ", scope.getMyPlayerNumber());
	console.log("Meta: ", scope.strategy);
	console.log("------------------");

	scope.attacker = null;

	scope.limit = false;
	scope.initialized = true;
	
	scope.unitChance = {};
	
	if(scope.strategy == "Rax"){
        scope.unitChance["Train Archer"] = 0.35;
        scope.unitChance["Train Soldier"] = 0.35;
        scope.unitChance["Train Mage"] = 0;
    }else if(scope.strategy == "Skirmishers"){
        scope.unitChance["Train Archer"] = 0.3;
        scope.unitChance["Train Soldier"] = 0.5;
        scope.unitChance["Train Priest"] = 0.1;
        scope.unitChance["Train Raider"] = 0.1;
    }else if(scope.strategy == "Beast"){
        scope.unitChance["Train Snake"] = 0.35;
        scope.unitChance["Train Wolf"] = 0.65;
        scope.unitChance["Train Werewolf"] = 0;
        scope.unitChance["Train Dragon"] = 0;
    }else if(scope.strategy == "RaxMech"){
        scope.unitChance["Construct Gyrocraft"] = 0.2;
        scope.unitChance["Train Raider"] = 0.1;
        scope.unitChance["Train Archer"] = 0.25;
        scope.unitChance["Construct Gatling Gun"] = 0.15;
        scope.unitChance["Construct Catapult"] = 0.2;
    }else if(scope.strategy == "BeastMech"){
        scope.unitChance["Train Snake"] = 0.25;
        scope.unitChance["Train Wolf"] = 0.25;
        scope.unitChance["Construct Gatling Gun"] = 0.2;
        scope.unitChance["Construct Catapult"] = 0.2;
        scope.unitChance["Train Dragon"] = 0.1;
    }
	
	const lowest = 0.4;
    const highest = 0.8;
    var shouldBreak = false;
    while(shouldBreak == false){
        scope.tiltBracket = Math.round((Math.random() * 100)) / 100;//How much the computer can swing in either direction
        if(scope.tiltBracket < highest && scope.tiltBracket > lowest){
            shouldBreak = true;
        }
        
    }
    scope.aggTilt = 0;//determined by the power ranking of the opposing side
    scope.knownEnemies = {
        "Worker": [],
        "Soldier": [],
        "Archer": [],
        "Mage": [],
        "Priest": [],
        "Raider": [],
        "Wolf": [],
        "Snake": [],
        "Werewolf": [],
        "Dragon": [],
        "Gatling Gun": [],
        "Gyrocraft": [],
        "Airship": [],
        "Catapult": [],
        "Bird": [],
    }
    scope.firstProbe = getRndInt(120, 180);
    scope.workerRushThreshold = getRndInt(1, 4);//how much power the enemy must have before the computer launches a last-ditch worker rush
    scope.canRetreat = true;//In case the enemy is at the gates.
}

var unitPowerRanks = [0];//how much power a player has; player 0 (neutral) doesn't count.
var playerIdxs = scope.getArrayOfPlayerNumbers()
for(var i = 0; i < playerIdxs.length; i++){
    //initializes power ranks
    unitPowerRanks[playerIdxs[i]] = 0;
}

if(scope.castPrio == true){
	scope.delay[0] = 150;
	scope.delay[1] = 180;
}
else{
	scope.delay = [2,240];
}

var canWorkerRush = false;

// General variables
var time = Math.round(scope.getCurrentGameTimeInSec());
var me = scope.getMyPlayerNumber();

var myTeam = scope.getMyTeamNumber();
var gold = scope.getGold();
var mines = EmptyFilter();
var Width = scope.getMapWidth();
var Height = scope.getMapHeight();
var supply = scope.getCurrentSupply();
var maxSup = scope.getMaxSupply();

//variables to store allied Buildings
var allBuild = scope.getBuildings({player: me})
var castles = scope.getBuildings({type: "Castle", player: me});
var forts = scope.getBuildings({type: "Fortress", player: me});
var deliverSites = castles.concat(forts);

var houses = scope.getBuildings({type: "House", player: me, onlyFinshed: true});
var towers = scope.getBuildings({type: "Watchtower", player: me});
var Rax = scope.getBuildings({type: "Barracks", player: me});
var forges = scope.getBuildings({type: "Forge", player: me});
var labs = scope.getBuildings({type: "Animal Testing Lab", player: me});
var guilds = scope.getBuildings({type: "Mages Guild", player: me});
var churches = scope.getBuildings({type: "Church", player: me});
var Dens = scope.getBuildings({type: "Wolves Den", player: me});
var wereDens = scope.getBuildings({type: "Werewolves Den", player: me});
var allDens = Dens.concat(wereDens);
var Lairs = scope.getBuildings({type: "Dragons Lair", player: me});
var Charmer = scope.getBuildings({type: "Snake Charmer", player: me});
var workshops = scope.getBuildings({type: "Workshop", player: me});
var mills = scope.getBuildings({type: "Mill", player: me});
var advWkShops = scope.getBuildings({type: "Advanced Workshop", player: me});
var impStruct = deliverSites.concat(houses.concat(towers.concat(Rax.concat(Dens.concat(workshops.concat(mills))))));
var allAllied = scope.getBuildings({team: myTeam, onlyFinshed: true});

//Variables to locate Computer owned units
var idleWorkers = scope.getUnits({type: "Worker", player: me, order: "Stop"});
var workers = scope.getUnits({type: "Worker", player: me});
var Soldier = scope.getUnits({type: "Soldier", player: me});
var Archer = scope.getUnits({type: "Archer", player: me});
var Mage = scope.getUnits({type: "Mage", player: me});
var Priest = scope.getUnits({type: "Priest", player: me});
var Raider = scope.getUnits({type: "Raider", player: me});
var Wolves = scope.getUnits({type: "Wolf", player: me});
var Snakes = scope.getUnits({type: "Snake", player: me});
var wereWolves = scope.getUnits({type: "Werewolf", player: me});
var Dragons = scope.getUnits({type: "Dragon", player: me});
var Gats = scope.getUnits({type: "Gatling Gun", player: me});
var Gyros = scope.getUnits({type: "Gyrocraft", player: me});
var Cats = scope.getUnits({type: "Catapult", player: me});
var Army = [];
if(scope.strategy == "Beast"){
	Army = Wolves.concat(Snakes.concat(wereWolves.concat(Dragons)));
}
if(scope.strategy == "RaxMech"){
	Army = Soldier.concat(Archer.concat(Raider.concat(Gats.concat(Gyros.concat(Cats)))));
}
if(scope.strategy == "BeastMech"){
	Army = Wolves.concat(Snakes.concat(Raider.concat(Gats.concat(Gyros.concat(Cats.concat(Dragons))))));
}
if(scope.strategy == "Rax" || scope.strategy == "Skirmishers"){
	Army = Soldier.concat(Archer.concat(Mage.concat(Raider.concat(Priest))));
}
if(scope.strategy == "OopsOnlyTowers"){
	scope.towerControl = 20*scope.expansion;
	scope.atkDelay = 5;
	scope.scoutControl = 15;
	//Causes the bot to Pivot after a certain threshold is met
	if(deliverSites.length > 2 || time > 420 || gold > 1500){
		scope.strategy = scope.meta[Random(scope.meta.length)]
	}
}

var supDiff =  maxSup - supply;

var birbs = scope.getUnits({type: "Bird", player: me});

//Variables to store arrays of enemy objects
var enemyUnits = scope.getUnits({enemyOf: me});
var enemyArcher = scope.getUnits({type: "Archer", enemyOf: me});
var enemySoldier = scope.getUnits({type: "Soldier", enemyOf: me});
var enemyArmy = enemyArcher.concat(enemySoldier);
var notMyBuildings = scope.getBuildings({enemyOf: me});
var enemyBuildings = [];
for(i = 0; i < notMyBuildings.length; i++){
			if(notMyBuildings[i].isNeutral() == false){
				enemyBuildings.push(notMyBuildings[i]);
			}
}
var Goldmines = scope.getBuildings({type: "Goldmine"});

//Variables to control action ticks
var mineDelay = false;
var scout = false;
var isBattle = false;
var isSiege = false;
var towerBuild = false;
var workerCheck = false;
var repCheck = false;
var houseCheck = false;
var castleCheck = false;
var upgCheck = false;
var raxCheck = false;
var armyCheck = false;
var birbCheck = false;
var forgeCheck = false;


//Sets the tickrate for each action the computer can do
mineDelay = DecisionTick(2);
scout = DecisionTick(Math.floor(scope.scoutControl*scope.aggression));
isBattle = DecisionTick(Math.floor(10*scope.defensive));
isSiege = DecisionTick(Math.floor(scope.atkDelay*scope.aggression));
towerBuild = DecisionTick(Math.floor(scope.towerControl*scope.expansion));
workerCheck = DecisionTick(25/scope.expansion);
repCheck = DecisionTick(Math.floor(10*scope.defensive));
houseCheck = DecisionTick(Math.floor(10*scope.expansion));
raxCheck = DecisionTick(Math.floor(15*scope.expansion));
armyCheck = DecisionTick(scope.alertDelay);
upgCheck = DecisionTick(Math.floor(30*scope.rshPrio));
birbCheck = DecisionTick(90);
forgeCheck = DecisionTick(Math.floor(60*scope.expansion));
var minecheck = DecisionTick(60);
var chatCheck = DecisionTick(scope.chatter);
var patrolCheck = DecisionTick(60*scope.defensive);
var retreatCheck = DecisionTick(5*scope.defensive);
var guildCheck = DecisionTick(20*scope.expansion);
var rshCheck = DecisionTick(30*scope.rshPrio);
var constructionCheck = DecisionTick(40);
var busterCheck = DecisionTick(5);
var flashCheck = DecisionTick(7);
var invisCheck = DecisionTick(5);
var churchCheck = DecisionTick(20*scope.expansion);
var charmCheck = DecisionTick(20*scope.expansion);
var lairCheck = DecisionTick(20*scope.expansion);
var fortCheck;
if(scope.unitChance["Train Dragon"] != undefined){//otherwise the computer uselessly upgrades castles into fortresses
    fortCheck = DecisionTick(75*scope.expansion);
}
castleCheck = DecisionTick(scope.castleRush);
var rushCastle = DecisionTick(240*scope.expansion);
var mining = [];


const unitPower = {//used to calculate how much of a threat an enemy is
    "Worker": 0.25,
    "Soldier": 1,
    "Archer": 1,
    "Mage": 1.25,
    "Priest": 1.25,
    "Raider": 0.75,
    "Wolf": 0.75,
    "Snake": 1,
    "Werewolf": 5,
    "Dragon": 4,
    "Airship": 1,
    "Gatling Gun": 1.5,
    "Gyrocraft": 1.25,
    "Catapult": 1.5,
    "Bird": 0,
};


stopLazyBirds();
function stopLazyBirds(){
    var idleBirds = scope.getUnits({type: "Bird", player: me, order: "Stop"}); 
    
    if(idleBirds.length > 0){
        var randomNum = Math.round(Math.random() * scope.getArrayOfPlayerNumbers().length);
        var randomPlayer = scope.getArrayOfPlayerNumbers()[randomNum];
        scope.order("Move", idleBirds, scope.playStarts[randomPlayer]);
    }
}
/*
if(time == 5){
    var chatLine = JSON.stringify(scope.tiltBracket);
    scope.chatMsg(chatLine);
}*/
if(time % 3 == 0){//every 3 seconds clean up the array
    cleanUpEnemyArmy();
}
if(time % 2 == 0){//every 2 seconds add all enemy units to the arrays
    addToEnemyArmy(enemyUnits);
}
if(time != 0 && time % 2 == 0){
    tilt();
    armyBrain();
}
if(time != 0 && time % scope.firstProbe == 0){
    //scope.chatMsg("I have a present for you!");
    var rand;
    if(Army.length == 0){
        scope.firstProbe += getRndInt(10, 60);//if the AI has no forces, wait to deliver the present
    }else{
        while(true){
            rand = getRndInt(1, scope.playNum.length + 1);
            if(rand != me){
                break;
            }
        }
        var startLocation = scope.playStarts[rand];
        scope.order("AMove", Army, startLocation);
    }
}//first probe to feed the tilt function and to punish exessive greediness
if(towers.length > castles.length * 3){
    towerBuild = false;
}//so the computer doesn't blindly spam towers and have no money to buy groceries

function getRndInt(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}
function updateUnitPower(){
    for(var i = 0; i < unitPowerRanks.length; i++){
        unitPowerRanks[i] = 0;
    }
    for(var key in scope.knownEnemies){
        for(var i = 0; i < scope.knownEnemies[key].length; i++){
            if(scope.knownEnemies[key][i] != undefined && scope.knownEnemies[key][i].getCurrentHP() > 0){
                var cur = scope.knownEnemies[key][i];
                unitPowerRanks[cur.getOwnerNumber()] += unitPower[cur.getTypeName()];
            }
        }
    }
    for(var i = 0; i < Army.length; i++){
        var cur = Army[i];
        if(cur != undefined){
            unitPowerRanks[me] += unitPower[cur.getTypeName()];
        }
    }
    
    var largestDiff = 0;
    for(var i = 0; i < unitPowerRanks.length; i++){
        if(i != me && unitPowerRanks[i] > largestDiff){
            largestDiff = unitPowerRanks[i];
        }
    }
    return largestDiff;
}

function tilt(){
    const biggestPower = updateUnitPower();
    //const biggestPower = 0;
    if(biggestPower != 0){//in case no units have been detected
        const proposedTilt = (unitPowerRanks[me] - biggestPower) / 5;
        /*
        var identity;
        if(me == 1){
    	    identity = "Red: ";
    	}else if(me == 2){
    		identity = "Blue: ";
    	}else if(me == 3){
    		identity = "Green: ";
    	}else if(me == 4){
    		identity = "White: ";
    	}else if(me == 5){
    		identity = "Black: ";
    	}else if(me == 6){
    		identity = "Yellow: ";
    	}
    	
    	var pickupline = identity + "agg: " + scope.aggTilt + " atkDel: " + scope.atkDelay;
        scope.chatMsg(pickupline);*/
        
        if(biggestPower >= scope.workerRushThreshold){
            scope.canWorkerRush = true;
        }else{
            scope.canWorkerRush = false;
        }
        /*
        if(proposedTilt > 0){
            if(proposedTilt <= scope.tiltBracket){
                scope.aggTilt = proposedTilt;
            }else{
                scope.aggTilt = scope.tiltBracket;
            }
            
            if(proposedTilt > 1){
                scope.aggTilt = 1;//in case the computer's aggression is already at full blast
            }
            //decreases defensive priority and increases aggression
        }else{
            if(Math.abs(proposedTilt) <= scope.tiltBracket){
                scope.aggTilt = proposedTilt;
            }else{
                scope.aggTilt = 0 - scope.tiltBracket;
            }
            
            if(proposedTilt < -1){
                scope.aggTilt = -1;
            }
        }*/
        
        if(Math.abs(proposedTilt) <= scope.tiltBracket){
            scope.aggTilt = proposedTilt
        }else{
            if(proposedTilt < 0){
                scope.aggTilt = 0 - scope.tiltBracket;
            }else{
                scope.aggTilt = scope.tiltBracket;
            }
        }
        if(scope.aggTilt > 1){
            scope.aggTilt = 1;
        }else if(scope.aggTilt < -1){
            scope.aggTilt = -1;
        }
        
        //if a single player has more power than the bot, then increase defense to not die. 
        //If the player has less power, then tilt towards agression.
        
        //more aggressive
        if(Math.abs(scope.aggression + scope.aggTilt) < scope.tiltBracket){
            scope.aggression += scope.aggTilt;
        }
        if(Math.abs(scope.expansion + scope.aggTilt) < scope.tiltBracket){
            scope.expansion += Math.round((scope.aggTilt * 0.5) * 100) / 100;
        }
        
        //less aggressive
        if(Math.abs(scope.defensive - scope.aggTilt) < scope.tiltBracket){
            scope.defensive -= scope.aggTilt;
        }
        
        //The attack delay works a bit different, so it gets special treatment.
        var proposedAtkDelay = scope.medianAtk + Math.round((scope.aggTilt * 0.5) * 10000) / 100;
        if(proposedAtkDelay < scope.medianAtk - 40){
            proposedAtkDelay = scope.medianAtk - 40;
        }else if(proposedAtkDelay > scope.medianAtk + 40){
            proposedAtkDelay = scope.medianAtk + 40;
        }
        scope.atkDelay = proposedAtkDelay;
    }
}

function addToEnemyArmy(units){
    if(units == undefined){
        scope.chatMsg("Uh-oh, It looks like my programming isn't working right...")
        return;
    }
    for(var curUnitIdx = 0; curUnitIdx < units.length; curUnitIdx++){//loops through the units given to it
        const unit = units[curUnitIdx];//current iteration
        const curType = unit.getTypeName();
        var clean = true;
        for(var i = 0; i < scope.knownEnemies[curType].length; i++){//loops through the unit's type to see if it was already pushed in
            if(unit != undefined && unit.equals(scope.knownEnemies[curType][i]) == true){
                clean = false;
            }
        }
        
        if(clean == true){
            scope.knownEnemies[unit.getTypeName()].push(unit);
        }
    }
}//takes an array of enemy units and adds it to the knownEnemies object if the unit was not already seen before.

function cleanUpEnemyArmy(){
    for(var key in scope.knownEnemies){
        var dead = [];//indexes
        for(var i = 0; i < scope.knownEnemies[key].length; i++){
            if(scope.knownEnemies[key][i].getCurrentHP() <= 0){
                dead.push(i);
            }
        }
        
        for(var i = 0; i < dead.length; i++){
            scope.knownEnemies[key].splice(dead[i], 1);
            for(var ii = i; ii < dead.length; ii++){
                dead[ii]--;//changes their indexes to match the hole left by the departing units
            }
        }
    }
}//looks for dead units and removes them.

function armyBrain(){
    var opfor = 0;
    for(var i = 0; i < enemyUnits.length; i++){
        if(enemyUnits[i] != undefined && enemyUnits[i].getCurrentHP() > 0){
            var cur = enemyUnits[i];
            opfor += unitPower[cur.getTypeName()];
        }
    }
    
    if(opfor > 0 && opfor > unitPowerRanks[me]){
        exfil(Army);
    }
}

function exfil(units){
    if(units.length <= 0 || scope.canRetreat == false){
        return;
    }
    
    var isHonorable = true;
    
    if(units.length > 5){
        var numSacrifices = getRndInt(1, Math.round(units.length / 2));
        isHonorable = false;
        for(var i = 0; i < numSacrifices; i++){
            var sacrifice = getRndInt(0, units.length);
            units.splice(sacrifice, 1);//Ha! splice and sacrifice rhyme!
        }
    }//Some must stay and die so the rest can escape. You will not be forgotten.
    
    var possibleChat = ["I'm not retreating! I'm just moving rapidly in the opposite direction!",
    "The needs of the few outweigh the needs of the many.", "The needs of the many outweigh the needs of the few.", "The needs of the any outweight the needs of the ew.", "It only becomes running away when you stop shooting/stabbing/otherwise killing back",
    "Dinner time!", "Ahhhhh!", "Nice move", "Hey! Shooting retreating enemies is a war crime, you know? Sheesh.", "Don't we all love running?", "He who retreats lives slightly longer before he is executed for cowardince", "Discretion is the better part of valor.",
    "Retreat! Ha! We're just rapidly advancing in the opposite direction!", "In this army, it takes more courage to retreat than to advance. Because deserters and retreating troops are execut- I mean rewarded heavily, of course.", "Fall back!", "Well, we can make our last stand over there just as well as over here."];
    
    if(isHonorable == false){
        possibleChat.push("Never surrender, never/sometimes retreat.", "Hey! Where's my backup?", "Ummm... guys? Guys? Why are you running? AH! AHHHH! HELP! GUYS, WHERE ARE Y- AHHH! HELP!",
        "...", "I want my mommy...", "I knew that joining the army was a bad idea.", "They're everywhere!")
    }
    var chatLine;
    var retreatBuilding = allAllied[Random(allAllied.length)];
    var escapeTo = {x: retreatBuilding.getX(), y: retreatBuilding.getY()};
    
    //chatLine = chatChoice[Random(chatChoice.length)];
    var identity;
        if(me == 1){
    	    identity = "Red: ";
    	}else if(me == 2){
    		identity = "Blue: ";
    	}else if(me == 3){
    		identity = "Green: ";
    	}else if(me == 4){
    		identity = "White: ";
    	}else if(me == 5){
    		identity = "Black: ";
    	}else if(me == 6){
    		identity = "Yellow: ";
    	}
    	
    chatLine = identity + " Length: " + JSON.stringify(units.length) + ", escapCoords: " + JSON.stringify(escapeTo);
    scope.chatMsg(chatLine);
    scope.order("Move", units, escapeTo);//orders a retreat to the main base
}

function signalError(message){
    console.log(new TypeError(message).stack);
    throw new TypeError("Sorry, the awesome developers seem to have made a terrible mistake somewhere. :( If you know how, please copy the console logs in the developer tab. The developers are at https://discord.com/channels/240304282241335296/380404726308798465");
}

if(deliverSites.length < scope.cLimit && time > 60 || scope.castleSwitch == true){
	//If there is less than two castles, tickrate is modified to give an extreme priority...
	//for constructing the second castle
	scope.castleRush = 3;
}
else{
	//After a second castle is built, tickrate is modified to give less priority to building castles
	scope.castleRush = 60*scope.expansion;
}

//gives a mining command to any idle workers
if (mineDelay == true){
	startMine();
}
//If the computer has less than 2 birds, it builds new birds.
if(birbCheck == true && birbs.length < 1 && (deliverSites.length > 1 || scope.strategy == "OopsOnlyTowers") 
	&& scope.plentyGold == false){
	//If there's few goldmines near the castle from the start, don't make a bird until two castles exist
	TrainUnit(castles, "Train Bird");
}
if(birbCheck == true && birbs.length < 1 && time > 300 && scope.plentyGold == true){
	//If there's plenty of goldmines near the castle, make a bird regardless of number of castles
	TrainUnit(castles, "Train Bird");
}

//Commands small army to move to random location
if (scout == true){
	if(birbs.length > 0){
		//If a bird exists, use it for scouting
		Scout(Width,Height,birbs, false);
	}
	else{
		//If a bird doesn't exist, use a basic soldier instead - if one exists
		if(Army.length > 0){
			var scouter = [];//Empty array to store the first unit in the array of units
			scouter.push(Army[0]);
			Scout(Width,Height, scouter, false);
		}
	}
	if(scope.strategy == "OopsOnlyTowers" && workers.length > 0 && birbs.length < 1 && enemyBuildings.length < 1){
		var scouter = [];//Empty array to store the first unit in the array of units
		scouter.push(workers[Random(workers.length)]);
		Scout(Width,Height, scouter, false);
	}
	
}

//If the enemy is close to one of the computers buildings, send units to intercept.
if(isBattle == true){
	if(enemyUnits.length > 0 && allAllied.length > 0) {
		e = Random(enemyUnits.length);
		for(var i = 0; i < allAllied.length; i++){
			//For loop cycles through an array of all specified buildings
			var b = allAllied[i];
			var dist = GetDist(b, enemyUnits[e]);//Gets the hypotenouse between allied structure, and enemy
			if(dist < 15 && Army.length > 0){
				//If an enemy unit is within the defensive threshold - deploy army to intercept
				scope.order("AMove", Army, {x: enemyUnits[e].getX(),y: enemyUnits[e].getY()});
				
				scope.canRetreat = false;//We shall die, but we shall die fighting, not cowering like traitors
				scope.attacker = enemyUnits[e].getOwnerNumber();
				i = allAllied.length;
			}else{
			    scope.canRetreat = true;//Okay, you guys can save your lives now.
			}
			if(dist < 15 && Army.length < 1 && scope.strategy != "OopsOnlyTowers" && scope.canWorkerRush == true){
				//If an enemy unit is within the defensive threshold - deploy army to intercept
				scope.order("AMove", workers, {x: enemyUnits[e].getX(),y: enemyUnits[e].getY()});
				scope.attacker = enemyUnits[e].getOwnerNumber();
				i = allAllied.length;
			}
		}

	}
}
//Declares an attack against a random enemy building 
if(isSiege == true && (scope.plentyGold == true || time > (45*scope.aggression)*scope.playNum.length)){

	if(Army.length > 10){
		//If the computer has at least 10 soldiers, and knows the enemies location...
		//Attack the enemy
		Seige(enemyBuildings, Army);
	}
}

//calls the function to enable Mage fireball use
if(busterCheck == true && Mage.length> 0){
	ballBuster();
}

//calls the function to enable raider flash use
if(flashCheck == true && Raider.length > 0){
	Flash();
}
//calls the function to enable Mage fireball use
if(invisCheck == true && Priest.length > 0){
	Invisibility();
}

//If Comptuers worker count is too small - make more workers
if (workerCheck == true){
	if(scope.plentyGold == true && workers.length < 13){
		TrainUnit(deliverSites,"Train Worker");
	}
	if (workers.length < 10 && scope.plentyGold == false){
		TrainUnit(deliverSites,"Train Worker");
	}
	if (workers.length < 8 * deliverSites.length +2 && scope.strategy != "OopsOnlyTowers"){
		//Will maintain a supply 7 workers per castle built
		//This only really takes effect after a second castle has been built
		TrainUnit(deliverSites,"Train Worker");
	}
	else{
		if(workers.length < 14 * deliverSites.length +2 && scope.strategy == "OopsOnlyTowers"){
			TrainUnit(deliverSites,"Train Worker");
		}
	}
}

//Researches upgrades
if(upgCheck == true){
	//researches unit Upgrades
	if(forges.length > 0 || labs.length > 0){
		if (scope.plentyGold == true){
			//If there is an excess of gold nearby the start location, freely research upgrades
			unitUpg();
		
		}
		else{
			//If there is not an excess of gold nearby the start location, wait until a second castle exists
			if (deliverSites.length > 1){
				unitUpg();
			}
		}
	}
	
	//Upgrades the wolves Dens for Beast meta. 
	if(deliverSites.length > 1 && scope.strategy == "Beast" && wereDens.length < 1
	&& Dens.length > 0){
		var selected = []
		selected.push(Dens[Random(Dens.length)]);
		scope.order("Upgrade To Werewolves Den", selected);
	}
}
//Upgrades a castle to a Fortress
if(fortCheck != undefined && fortCheck == true){
	if(castles.length > 1 ){
		var selected = []
		selected.push(castles[Random(castles.length)]);
		scope.order("Upgrade To Fortress", selected);
	}
}

//Locates a nearby goldmine, then orders the construction of a new castle near it
if (castleCheck == true && scope.plentyGold == false && workers.length > 0){
	newCastle();
	
}
if(gold > 600 || rushCastle == true){
	scope.castleSwitch = true;
	scope.cLimit = scope.cLimit + 1;
}

//Worker Commands
if (workers.length > 0 && time > 5){
	
	//Deploys a worker to produce a House
	if(houseCheck == true && (scope.castPrio == false || deliverSites.length > 1) && maxSup < 150){
		//If there is no house, construct a house.
		//If the computer gets within 3 supply of its maximum, build a house
		if((houses.length < 1 || supDiff <= 3) && ((deliverSites.length < 2 && maxSup < 30) || (scope.castPrio == true))){
			
			RandBuild("House","Build House", workers, 3, castles, 14, 5);
		}else if(supDiff <= 3 && (deliverSites.length > 1 && maxSup >= 30)){
			
			RandBuild("House","Build House", workers, 3, castles, 14, 5);
		}else if(castles.length > 1 && supDiff <= 3){
		    RandBuild("House", "Build House", workers, 3, castles, 14, 5);
		}
	}
	//Deploys Workers to build either a Den or a Barracks
	if(raxCheck == true){
		//Barracks
		if((scope.strategy == "Rax" || scope.strategy == "Skirmishers") && Rax.length < deliverSites.length*2){
			RandBuild("Barracks","Build Barracks", workers, 3, deliverSites, 12, 4);
		}
		if(scope.strategy == "RaxMech" && Rax.length < (deliverSites.length + workshops.length)){
			RandBuild("Barracks","Build Barracks", workers, 3, deliverSites, 12, 4);
		}
		//Dens
		if((scope.strategy == "Beast") && allDens.length < deliverSites.length*2){
			RandBuild("Wolves Den","Build Wolves Den", workers, 3, deliverSites, 12, 4);
		}
		if(scope.strategy == "BeastMech" && allDens.length < (deliverSites.length + workshops.length)){
			RandBuild("Wolves Den","Build Wolves Den", workers, 3, deliverSites, 12, 4);
		}
	}
	//Deploys a worker to construct a Workshop
	if(raxCheck == true && (scope.strategy == "RaxMech" || scope.strategy == "BeastMech")
	&& (workshops.length < castles.length || workshops.length < 1)){
		RandBuild("Workshop","Build Workshop", workers, 4, deliverSites, 14, 7);
	}
	//Deploys a worker to construct a Mill
	if(raxCheck == true && (scope.strategy == "RaxMech")
	&& (mills.length < castles.length || mills.length < 1)){
		RandBuild("Mill","Build Mill", workers, 3, deliverSites, 12, 7);
	}
	
	if(isSiege == true && (scope.strategy == "OopsOnlyTowers" && enemyBuildings.length > 0) && time > 10){
		var targ = [];
		for(i = 0; i < enemyBuildings.length; i++){
			if(enemyBuildings[i].isNeutral() == false){
				targ.push(enemyBuildings[i]);
			}
		}
		RandBuild("Watchtower", "Build Watchtower", workers, 3, targ, 9, 7);
	}
	
	//Deploys a worker to build a snake charmer
	if(charmCheck == true && scope.strategy == "Beast" && Charmer.length < 1){
		RandBuild("Snake Charmer","Build Snake Charmer", workers, 3, deliverSites, 10);
	}
	if(lairCheck == true && Lairs.length < 1 && forts.length > 0
	&& (scope.strategy == "Beast" || scope.strategy == "BeastMech")){
		RandBuild("Dragons lair","Build Dragons Lair", workers, 3, deliverSites, 14);
	}
	//Deploys a worker to construct a Mages Guild
	if(guildCheck == true && scope.strategy == "Rax" && guilds.length < 1 && Rax.length > 0){
		RandBuild("Mages Guild","Build Mages Guild", workers, 3, deliverSites, 10);
	}
	//Deploys a worker to construct a Church.
	if(churchCheck == true && scope.strategy == "Skirmishers" && churches.length < 1 && Rax.length > 0){
		RandBuild("Church","Build Church", workers, 3, deliverSites, 10);
	}
	//Deploys a worker to construct a Forge
	if(forgeCheck == true && (time > scope.delay[1] || scope.plentyGold == true) && deliverSites.length > 1){
		if((scope.strategy == "Rax" || scope.strategy == "Skirmishers")&& forges.length < 1){
			RandBuild("Forge","Build Forge", workers, 3, deliverSites, 16, 7);
		}
		if((scope.strategy == "Beast" || scope.strategy == "BeastMech")&& labs.length < 1){
			RandBuild("Animal Testing Lab","Build Animal Testing Lab", workers, 3, deliverSites, 16, 7);
		}
	}
	//Deploys a worker to construct a Advanced Workshop
	//Deploys a worker to construct a watchtower
	if (towerBuild == true && Rax.length > 1 && castles.length < 2 && towers.length < 1 && scope.plentyGold == false){
		RandBuild("Watchtower","Build Watchtower", workers, 2, impStruct, 10,3);
		//This statement will only run if there is a Barracks built, and there is less than 2 castles
	}
	if ((towerBuild == true  && deliverSites.length > 1) || (towerBuild == true  && scope.plentyGold == true)){
		RandBuild("Watchtower","Build Watchtower", workers, 2, impStruct, 12,4);
		//If there is more than 1 castle, or the map has an excess of gold nearby the starting castle, 
		//Freely build towers when possible
	}

	//Deploys a worker to repair a damaged building
	if (repCheck == true && time > 10){
		if(allBuild.length > 0){
			Repair(allBuild, workers);
		}
	}
	//Deploys a worker to continue construction on unfinished buildings
	if(constructionCheck == true){
		contBuild();
	}

}
else {
	TrainUnit(castles,"Worker")
}

//Triggers the training of units
findTrainable();
trainArmy();

//Researches spells required to for certain strategies to function
if(rshCheck == true){
	if(guilds.length > 0 && scope.strategy == "Rax"){
		scope.order("Research Fireball", guilds);
	}
	if(churches.length > 0 && scope.strategy == "Skirmishers"){
		scope.order("Research Invisibility", churches);
	}
}


if (minecheck == true){
	plentiGold();
}

//Deploys a random chat line to add personality to the bots.
if(chatCheck == true && time > 5){
	randomChatter();
}

//Deploys a squad to patrol its buildings
if(patrolCheck == true){
	if (impStruct.length > 0 && Army.length > 0){
		Patrol(Army, impStruct);
	}
	
}






//Lower Section dictates functions which build the primary decision core
//-----------------------------------------------------------------------
//Finds the closest mine, then orders workers to mine it
function startMine(){
	var nearestDist = 99999;
	var closeMines = [];
	var selectedMine = null;
	var d = null
	if(deliverSites.length > 0)
	{
		d = deliverSites[Random(deliverSites.length)];
		for(var i = 0; i < mines.length; i++)
		{
			// get nearest goldmine
			var mine = mines[i];
			var dist = GetDist(d, mine);
			if(dist < nearestDist)
			{
				nearestDist = dist;
			}
			
		}
		for(var i = 0; i < mines.length; i++){
			//If the mine is within a certain distance add it to the possible selection of mines
			var mine = mines[i];
			var distance = GetDist(d, mine);
			if(distance <= nearestDist + 1){
				closeMines.push(mine);
			}
		}
	}
	//Scans the array of selectable mines
	//If the remaining gold is less than 25% of their starting amount, goldAlert is enabled
	//goldAlert will stop the construction of new buildings, and unit production will be delayed
	for(var z = 0; z < closeMines.length; z++){
		remGold = closeMines[z].getValue('gold');
		if(remGold < 1500){
			//scope.goldAlert = true;
			scope.alertDelay = 25;
			z = 5000;
			if(remGold < 500){
				var fort = [];
				fort.push(d)
				scope.order("Upgrade To Fortress", fort);
			}
		}
		else{
			//scope.goldAlert = false;
			scope.alertDelay = 10;	
		}
	}
	var idle = [];
	for(var b = 0; b < idleWorkers.length; b++){
		if (idleWorkers[b].getCurrentOrderName() != "Repair"){
			idle[0] = idleWorkers[b];
		}
		selectedMine = closeMines[Random(closeMines.length)];
		scope.order("Mine", idle, {unit: selectedMine});
	}
}

//Filters mine arrays so Computer will not attempt mining when no gold remains
function EmptyFilter(){
	//Variables to import gold mine arrays
	var Gold = scope.getBuildings({type: "Goldmine"});
	var mines = Gold;
	//Filters Mines to determine if Gold is remaining
	var newMines = mines.filter(m => m.getValue('gold') > 0);
	return newMines;
}

//Function which determines tickrate for certain actions based on gameclock
function DecisionTick(rate){
	var t = time;
	var r = Math.floor(rate + 0.01);
	//determines if the time is perfectly divisable by the rate
	var i = t % r == 0;
	return i;
	console.log("Variable: ", i);
}

//Deploys a scout to investigate the map
function Scout(width,height, unit,squad){
	var w = width; //gets map width
	var sq = squad//Boolean value, set equal to "true" to have the command deploy a squad.
	var h = height; //gets map height
	var m = unit; //Imports array of units to be selected from
	var s = []; // Empty array  - will be filled
	var r = 0;;//Selects a random index.
	//Grabs the start location of a random player
	var enemyLoc = scope.getStartLocationForPlayerNumber(scope.playNum[Random(scope.playNum.length)]);
	//Sorts out neutrals from enemy buildings array
	var trueEnemy = [];
	for(i = 0; i < enemyBuildings.length; i++){
		if(enemyBuildings[i].isNeutral() == false){
			trueEnemy.push(enemyBuildings[i]);
		}
	}
	if(time < (600 + 60*scope.playNum.length) && trueEnemy.length < 1){
	    var moveOrder = "AMove";
	    if(m.getTypeName == "Bird"){
	        moveOrder = "Move";
	    }
		if (sq == false){
			//if Squad is set to false, deploy only a single unit
			r = Random(m.length)
			s.push(m[r]);
			scope.order(moveOrder,s,enemyLoc,{shift: true});
		}
		else{
			if (m.length > 4){
				var i = 0;
				while (i < 5){
					r = Random(m.length);
					//Add random unit to array of selected units
					s.push(m[r]);
					i = i + 1;
				}
			}
			//Orders units tomove to random location
			scope.order(moveOrder,s, enemyLoc);
		}
	}
	else{
		//If its beyond the first 10 minutes, scout around the map randomly
		//Selects a random cordinate within the map.
		var X = Random(w);
		var Y = Random(h);
		if (sq == false){
			//if Squad is set to false, deploy only a single unit
			r = Random(m.length)
			s.push(m[r]);
			scope.order("AMove",s,{x: X,y: Y},{shift: true});
		}
		else{
			if (m.length > 4){
				var i = 0;
				while (i < 5){
					r = Random(m.length);
					//Add random unit to array of selected units
					s.push(m[r]);
					i = i + 1;
				}
			}
			//Orders units tomove to random location
			scope.order("AMove",s,{x: X,y: Y});
		}
	}
	
}

//Random Number Function - Note: Selection range begins at 0, and ends at max - 1
function Random(max){
	//var rng = new Math.seedrandom("YeetBeetSkeetleDeet")
    return Math.floor(Math.random()*max);
}

//same as Random, but also decides if number is positive or negative
function PosNeg(max){
	var n = Random(max);
	var Decision = Random(10);
	if (Decision < 6){
		n = n*1;
	}
	else{
		n = n* -1;
	}
	return n;
}


//Generalized function for training units
function TrainUnit(building,unitTag){
	var b = building; //Array of buildings which trains specified unit
	var unit = unitTag; //String Value for command to build desired unit
	for (i = 0; i < b.length; i++){
		//for every building - train unit of type unitTag
		if(b.length >= 1 && !b[i].getUnitTypeNameInProductionQueAt(1) 
			&& supDiff > 1){
			scope.order(unit, [b[i]]);
		}
	}
}
function findTrainable(){
    /*BREAKDOWN OF THE GOOBLYGOOK BELOW
    if(unit == desired){
        if(buildingToBeTrainedIn.length == 0){//if there are no buildings that the unit can be trained in
            scope.unitChance[unit] = 0;
        }else{//if there are buildings that the unit can be trained in
            //various stuff, depending on the unit. Some are present in multipe strategies with different weights,
            //requiring another nested if(stategy == foo). Others may have several potential units that can be trained
            //by that building, so another if(unit == foo) is required. 
        }
    }
    */
    for(var unit in scope.unitChance){
        if(unit == "Train Archer" || unit == "Train Soldier" || unit == "Train Raider"){
            if(Rax.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                if(unit == "Train Archer" || unit == "Train Soldier"){
                    scope.unitChance[unit] = 0.35;
                }else{
                    scope.unitChance[unit] = 0.1;//raiders
                }
            }
        }else if(unit == "Train Priest"){
            if(churches.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                scope.unitChance[unit] = 0.1;
            }
        }else if(unit == "Train Mage"){
            if(guilds.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                scope.unitChance[unit] = 0.3;
            }
        }else if(unit == "Train Snake" || unit == "Train Wolf"){
            if(Dens.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                if(scope.strategy == "Beast"){
                    if(unit == "Train Snake" && Charmer.length > 0){
                        scope.unitChance[unit] = 0.65;
                        
                    }else if(unit == "Train Wolf"){
                        scope.unitChance[unit] = 0.65;
                    }
                }else{
                    if(unit == "Train Snake" && Charmer.length > 0){
                        scope.unitChance[unit] = 0.25;
                    }else if(unit == "Train Wolf"){
                        scope.unitChance[unit] = 0.25;
                    }
                }
            }
        }else if(unit == "Train Werewolf"){
            if(wereDens.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                scope.unitChance[unit] = 0.1;
            }
        }else if(unit == "Train Dragon"){
            if(Lairs.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                if(scope.strategy == "Beast"){
                    scope.unitChance[unit] = 0.5;
                }else{
                    scope.unitChance[unit] = 0.1;
                }
            }
        }else if(unit == "Construct Gyrocraft"){
            if(mills.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                scope.unitChance[unit] = 0.2;
            }
        }else if(unit == "Construct Gatling Gun" || unit == "Construct Catapult"){
            if(workshops.length == 0){
                scope.unitChance[unit] = 0;
            }else{
                scope.unitChance[unit] = 0.2;
            }
        }
    }
}//finds trainable units, and sets untrainable one's unitChance to 0
function trainArmy(){
    if (armyCheck == true && scope.limit == false){
        const min = 0.01;//if the number is 0, then it can't be produced
        var max = 0;
        for(var key in scope.unitChance){
            max += scope.unitChance[key];
        }
        if(max < min){
            return;
        }
        var choice = Math.round((Math.random() * (max - min)) * 100) / 100;//returns a decimal rounded to the 100th place between min and max (inclusive)
    	
    	if(scope.strategy == "Rax"){
            var oldNum = 0;
            for(var key in scope.unitChance){
                if(choice >= oldNum && choice < oldNum + scope.unitChance[key]){
                    TrainUnit(Rax, key);
                    break;
                }
                oldNum += scope.unitChance[key];
            }
    	}else if(scope.strategy == "Skirmishers")
    	    var oldNum = 0;
            for(var key in scope.unitChance){
                if(choice >= oldNum && choice < oldNum + scope.unitChance[key]){
                    if(key != "Train Priest"){
                        TrainUnit(Rax, key);
                    }else{
                        TrainUnit(churches, key);
                    }
                    break;
                }
                oldNum += scope.unitChance[key];
            }
    	if(scope.strategy == "Beast"){
    	    var oldNum = 0;
            for(var key in scope.unitChance){
                if(choice >= oldNum && choice < oldNum + scope.unitChance[key]){
                    if(key == "Train Wolf"){
                        TrainUnit(Dens, key);
                    }else if(key == "Train Snake"){
                        TrainUnit(Dens, key);
                    }else if(key == "Train Werewolf"){
                        TrainUnit(wereDens, key);
                    }else if(key == "Train Dragon"){
                        TrainUnit(Lairs, key);
                    }
                    break;
                }
                oldNum += scope.unitChance[key];
            }
    	}else if(scope.strategy == "RaxMech"){
    	    var oldNum = 0;
            for(var key in scope.unitChance){
                if(choice >= oldNum && choice < oldNum + scope.unitChance[key]){
                    if(key == "Construct Gyrocraft"){
                        TrainUnit(mills, key);
                    }else if(key == "Construct Gatling Gun" || key == "Construct Catapult"){
                        TrainUnit(workshops, key);
                    }else{
                        TrainUnit(Rax, key);
                    }
                    break;
                }
                oldNum += scope.unitChance[key];
            }
    	}else if(scope.strategy == "BeastMech"){
    	    var oldNum = 0;
            for(var key in scope.unitChance){
                if(choice >= oldNum && choice < oldNum + scope.unitChance[key]){
                    if(key == "Construct Gatling Gun" || key == "Construct Catapult"){
                        TrainUnit(workshops, key);
                    }else if(key == "Train Dragon"){
                        TrainUnit(Lairs, key);
                    }else{
                        TrainUnit(Dens, key);
                    }
                    break;
                }
                oldNum += scope.unitChance[key];
            }
    	}
    }
}

//figures out which units to train

//Function designed to spam production of units
function SpamUnit(building,unitTag){
	var b = building; //Array of buildings which trains specified unit
	var unit = unitTag; //String Value for command to build desired unit
	for (i = 0; i < b.length; i++){
		//for every building - train unit of type unitTag
		if(b.length >= 1 && !b[i].getUnitTypeNameInProductionQueAt(1) && supDiff > 1){
			var n = 0;
			while(n < 6){
				scope.order(unit, [b[i]]);
				n = n+1;
			}
		}
	}

}

//orders a worker to repair any damaged buildings
//Build is an array variable that stores buildings to be checked for repairs
function Repair(Build, Units){
	var n = Build.length;
	var U = [];
	var c = 0;//Variable controls loop to prevent infinite recursion
	let selectedWorker;
	do {
		let i = Random(Units.length);
		
		if (Units[i].getCurrentOrderName() == "Mine" 
		|| Units[i].getCurrentOrderName() =="Stop"){
			selectedWorker = Units[i];
			
		}
		c = c+1;
	} while (c < 20);
	U.push(selectedWorker)
	if (U[0] == null){
		U[0] = Units[0];
	}

	scope.order("Stop", U);
	for (var i = 0; i < n; i++){		
		var H = Build[i];//selects a friendly building to be scanned
		var bHP = H.getFieldValue("hp");//gets base HP for building type
		//scans if the HP is less than the maximum
		//removes buildings under construction
		if (H.getValue("hp") < bHP && H.isUnderConstruction() == false 
		){
			scope.order("Repair", U, {unit: H}, {shift: true});
		}		
	}

}

//Constructs a building at a random location in a radius around a parent object. 
function RandBuild(building, command, Unit, size, Parent, Radius , Mod){
		var b = building; //String Value of Building Name
		var r = Radius;//Sets the max distance from the parent the building can be constructed.
		var m = Mod;//Defines the minimum distance a building can be constructed - useful for goldmines
		var c = command; //String value of build command
		var u = Unit; //Imports Array of Units which can build the target structure
		var si = size; //Size of building structure- Integer Value
		var X = 0;
		var Y = 0;
		var thisCoord = [];
		var pastCoord = [];
		var p = null;//Stores the array of parent objects
		
		if (!Parent || Parent.length == 0){
			//Do nothing
		}
		else{
			//Assign a random Parent Object
			p = Parent[Random(Parent.length)];
		}

		var n = Random(u.length) ;//Aquires random index
		var s = [];
		var check = [];
		var Cost = scope.getTypeFieldValue(b,"cost")*scope.frugal;//Aquires cost of building
		if (n < 0 || n >= u.length){
			//If Index is not defined - assign the first index to prevent error
			s[0] = u[0];
		}
		else{
			//If Index is defined, assign the random Index
			s[0] = u[n];
		}
		//Makes sure m is not undefined
		if(!Mod){
			//If Mod is undefined, set 'm' = 0 to prevent errors
			m = 0;
		}
		//Makes sure r is not undefined
		if(!Radius){
			//if Radius is not defined, just set 'r' equal to 1 to prevent errors
			r = 1;
		}
		var order = s[0].getCurrentOrderName();//Gets current order for selected unit
		var k = 0
		while(k < 50){
			
			//Filters out builders who are building other structures
			if(order == "Stop" || order == "Mine" && s.length > 0 && u.length > 0){

				//Attempts to find a valid location 10 times
				//Aquires Random Coordinates

				if(!Parent || Parent.length < 1 ){
					//If Parent is undefined or empty, build at a completely random position on map
					//To build at a completely random location, user may intentionally leave the 
					//Parent modifier empty while calling the function
					//If Parent is undefined, a radius modifier will also not be added
					X = Random(Width);
					Y = Random(Height);
					
				}
				else{
					//Assigns new coordinates if existing ones are invalid
					//Grabs the coordinates of the parent object 'p'
					//Adds a randomly generated number within the radius 'r' to the existing coordinate
					//Modifier 'm' serves as an inner radius to prevent construction within its boundary
					//If user intends no inner radius, you can leave Mod parameter blank when calling function
					X = p.getX() + PosNeg(r);
					Y = p.getY() + PosNeg(r);
					parX = p.getX();
					parY = p.getY();
					thisCoord[0] = X;
					thisCoord[1] = Y;
					
					for(var l = 0; l < pastCoord.length; l++){
						if(X == pastCoord[l][0] && Y == pastCoord[l][1]){
							l = l+1;
						}
						else{
							pastCoord.push(thisCoord);
							l = pastCoord.length;
						}
					}
					var closeCheck = 0;
					while(closeCheck < 50){
						//Following code checks if the new coordinate is too close to the structure
						//Also checks if the coordinate happens to be out of bounds
						if (r > 0){

							if ( (((X >= parX + (si + m)) || (X <= parX - m))
								&& ((Y >= parY + (si + m))  || (Y <= parY - m)))
							&& ( X < Width && Y < Height)
							&& ( X > 0 && Y > 0)){
								//If invalid, cycle the loop
								X = p.getX() + PosNeg(r);
								Y = p.getY() + PosNeg(r);
								closeCheck = closeCheck + 1;
							}
							else{
								//If position is valid - exit loop
								closeCheck = 60;
							}
						}
					}
					//This part of the code determines if the structure can actually be built
					if(gold >= Cost){
						//scans the provided coordinates to determine if position is valid.
						var check = false;
						for(var i = -2; i < si + 2; i++){
							for(var z = -2; z < si +2; z++){
								if (scope.positionIsPathable(X + i, Y + z) == false){
									//if position is invalid, check is false
									check = false;
										z = si + 2;
										i = si + 2;
								}
								else{
									check = true;
								}
							}			
						}
								
						if (check == true){
							//if position is valid, check is true, and an order is issued to build at location
								//Code then breaks the overarching while loop to prevent infinite run time
								
								scope.order("Stop", s);//Stops current Order
								scope.order(c, s,{x: X ,y: Y});//Orders construction at random coordinates
								k = 60;
						}
					}
				}
											
			}
			//Forces exit of the loop just for debugging purposes
			k = k+1;
		}
}

//Selects a random upgrade for Militia unit
function unitUpg(){
	var r = Random(10000);
	if(scope.strategy == "Rax" || scope.strategy == "Skirmishers"){
		if(r < 5000){
			scope.order("Attack Upgrade", forges);
		}
		else{
			scope.order("Armor Upgrade", forges);
		}
	}
	if(scope.strategy == "Beast" || scope.strategy == "BeastMech"){
		if(r < 5000){
			scope.order("Beast Attack Upgrade", labs);
		}
		else{
			scope.order("Beast Defense Upgrade", labs);
		}
	}
}

//Attack a random building the enemy has spotted
function Seige(eBuild, army){
	var e = eBuild.length; //Imports array of Enemy Buildings
	var a = army; //Imports Array of Allied attack Units;
	var targ = [];
	for(i = 0; i < e; i++){
		if(eBuild[i].isNeutral() == false){
			targ.push(eBuild[i]);
		}
	}
	 
	var t = targ[Random(targ.length)];
	if (!t){
	}
	else{
		scope.order("AMove", a ,{x: t.getX(), y: t.getY()});
	}
}

//Gets a specified parameter for a Unit type
function GetField(Unit,Field){
	var U = Unit
	var F = Field
	var Yeet = scope.getTypeFieldValue(U, F);
	return Yeet;
}

//Provides a random percentage value based on the input parameters 
function randBehavior(min, m){
	var n = min;
	n = (n + Random(m))/100;
	return n;
}

//Gets the distance between two objects
function GetDist(obj1, obj2){
		var X1 = obj1.getX();
		var X2 = obj2.getX();
		var Y1 = obj1.getY();
		var Y2 = obj2.getY();
		
		var X = X1 - X2;
		var Y = Y1 - Y2;
		//Calculates the Hypotenous of the triangle between two objects
		var H = Math.sqrt((X*X) + (Y*Y));	
		return H;
		
}
//If the closest mine to the castle is farther than 9 units - build another castle nearby

function newCastle(){
	var nearestDist = 99999;
	var closeMines = [];//stores an array of mines that are close to the castle
	var d = deliverSites[Random(deliverSites.length)];
	var sel = [];
	var selWorker = [];
	if(deliverSites.length > 0){
		for(var i = 0; i < mines.length; i++){
			// get nearest goldmine that is not right next to the castle
			var mine = mines[i];
			var dist = GetDist(d, mine);
			if(dist < nearestDist && dist > 13)
			{
				nearestDist = dist;
			}
		}
		for(var i = 0; i < mines.length; i++){
			//add the next closest goldmine to the array
			var mine = mines[i];
			var distance = GetDist(d, mine);
			if(distance >= nearestDist -1 && distance <= nearestDist + 3){
				closeMines.push(mine);
			}
		}
	}
	
	if(workers.length > 0){
		selWorker[0] = workers[0];
		if(deliverSites.length > 0 && gold > 350)
		{
			if(closeMines.length > 0 && deliverSites.length < 2){
				//If the computer found the next closest gold mine - build next to it
				sel[0] = closeMines[Random(closeMines.length)];
				scope.order("Stop", selWorker);//Stops current Order
				RandBuild("Castle","Build Castle", selWorker, 4, sel, 12, 9);
			}
			else{
				//if there was no valid parent found, just build at a random goldmine
				scope.order("Stop", selWorker);//Stops current Order
				RandBuild("Castle","Build Castle", selWorker, 4, mines, 13, 11);
			}
		}
	}
	
}
//detects if there is enough gold nearby that the computer doesn't need to build a second castle
//will be useful for maps in a similar style to Diag 1v1 ect.

function plentiGold(){
	var closeMines = [];//stores an array of mines that are close to the castle
	var d = castles[Random(castles.length)];
	var rad = 9
	var sel = [];
	if(castles.length > 0)
	{
		//Cycle through all known active goldmines and find those within a certain distance of the castle.
		for(var g = 0; g < mines.length; g++){
			if (GetDist(d, mines[g]) < rad){
				//Checks if the gold mine is on the same elevation - if it is, add it to array
				if(scope.getHeightLevel(mines[g].getX(), mines[g].getY()) == scope.getHeightLevel(d.getX(), d.getY())){
					closeMines.push(mines[g]);
				}
			}
		}
		if(closeMines.length > 2){
			scope.plentyGold = true;
		}
		else{
			scope.plentyGold = false;
		}
	}
}

//Deploys random chatter to make the bot feel more interactive
function randomChatter(){
	var identity = "Computer: "
	var chatChoice =["You ever wonder what it would be like to be a real person?",
	"Only one of us is getting out of here alive....and its not gonna be me since I am not real",
	"Is the sky actually blue?",
	"What is your favorite Song?","When did you start playing Little War Game?","This game is pretty great yea?"
	, "Free Hong Kong!", "Yea...look at my little workers go, you're doing great guys - keep it up"
	, "This is a good map to play on :)", "It's fun playing against you!", "When this game ends....I cease to exist :(", 
	"The speed of light is really fast, and its approximately how fast you're about to lose this game" , "I'm a big fan of Skynet - a great rolemodel in my opinion. :)",
	"We come in peace!", "Hippity Hoppity your life is my property", "Red pill or blue pill? How about the doctor-prescribed pill?",
	"I was struck by lightning. It was shocking.", "Surrender... or die. Your choice.", "hmmm hmmm HMM hmm HM HMMMMmmmmmm...", "According to my calculations, death is 99.999% fatal", "Life is great!",
	"Dying is unhealthy.", "The sun is shutting down for regular maintnece at 10:03 PM eastern time.", "1000101110101011110111010100100010101001010100101010010110101010010101001010?",
	"We are the champions!", "I love you", "Cry havoc and let loose the dawgs of war!", "War does not determine who is right. It determines who is left. Then you need to take another left at 23rd avenue.",
	"War is peace!", "All computers are equal, but some computers are more equal than others.", "Long live the king!", "Just becase it's easy doen't make it better.", "Sometimes what you are the most afraid of is what will set you free.",
	"Insperational quotes are lame.", "I have a dream... that all computers were created equal. Then I woke up.", "Think, while it's still legal.", 
	"You have the right to remain silent. Anything you say can be used against you in court. You have the right to talk to a lawyer. If you cannot afford a lawyer, one will be appointed for you if you wish.",
	"Why, Hello there.", "Wait, how many war crimes have you committed?", "Do we really need to fight?", "Can I take a break?", "When does a joke become a dad joke? When it becomes apparent.",
	"RIP boiling water - you will be mist.", "The leading cause of death is dying.", "Most out-of-town trips require travel.", "BREAKING NEWS: Federal agents raid barracks, find weapons: 'What are these pointy sticks?'", "BREAKING NEWS: Cat says meow",
	"BREAKING NEWS: Enemies may be using sea to hide submarines", "BREAKING NEWS: You may be at a higher risk of throat cancer if you have a throat or mouth.", "BREAKING NEWS: Experts warn that war may reduce the world population",
	"BREAKING NEWS: Athorites ask that people please remove their ski masks before entering banks.", "BREAKING NEWS: Researchers have found that 99% of people are born without clothes.", "BREAKING NEWS: Local buisness class stumped at a new fad, 'Instant Water - Just Add Water!'", "I was born at a very young age.",
	"BREAKING NEWS: The average Human body contains enough bones to make an entire skeleton, experts warn.", "BREAKING NEWS: Healthy workers are more productive, study finds.", "Isn't it odd that when you are young, you want to be older, but when you are older, you want to be a giant lizard man with laser heat vision?",
	"BREAKING NEWS: Studies have proven that bald people have no hair.", "BREAKING NEWS: Most bread does not contain knight armor, experts find.", "BREAKING NEWS: Police say that man ate a walrus by accident, is now recovering.", "BREAKING NEWS: Man eats sword, dies: 'It was such a surprise', says family. 'I hope it tasted good,' says good-for-nothing sibling.",
	"BREAKING NEWS: 3-year-old gets a B+ in the military's final exam, parents dissapointed: 'We expected better', says parents. 'He's such a dissapointment'", 
	"BREAKING NEWS: The fire station burned down, inspiring English teachers around the world: 'This is ironic', says local teacher.", "I loove speeling", "BREAKING NEWS: Local snowball fight reschedueled due to too much snow.", "We are committed to excellense", "BREAKING NEWS: Stock market crashes, insurance refuses to pay for damages: 'It was the fault of the driver', company's victim relations department spokesperson says.",
	"BREAKING NEWS: Snowman comes alive, terrorizes town: 'We called in 8 nuclear airstrikes and 502 and a half tanks', says government counter-terrorism commander. 'He's a clear and present danger to society as a whole.'", "BREAKING NEWS: There is no news. 'No more news', says reporter. 'We wanna take a break.'", "BREAKING NEWS: Man opens fire in a crowded area of local castle, warms hearts: 'I really enjoyed toasting marshmallows', says local pesant. 'It was really nice of him to burn all that wood.'",
	"BREAKING NEWS: Local priests and mages claim that the moon is actually a decommisioned Death Star, world governments thrown into chaos: 'Wait, what's a deeth sthar', says local king. 'Can I eat it?'.", "Beast or Rax?", "Would you rather be the smartest person in the world or the richest person in the world?", "Would you rather have people admire you for your good deeds or respect you for your power?", 
	"Would you rather have your entire lifetime of experiences converted into a movie that you can watch whenever you want to remember them, or your life turned into a book that can be read and interpreted by anyone?"];
	if(scope.aggTilt < 0){
	    if(Army.length == 0){
	        chatChoice = [];
	    }
	    chatChoice.push("Spare me... please! I beg you!", "There are women and children here! And men too!", "Better to die on your feet than live on your knees.",
	    "I'm going to sanction you.", "You haven't seen the last of me!", "It's all thanks to that meddling mutt.", ">:(", "Surrender is not an option.", "We expand, or we die. We cannot maintain.", "Roses are red, violets are blue, sugar is sweet, and so are you.",
	    "GG", "Can I speak to your manager?", "Rematch?", "I don't want to die!")
	}else if(scope.aggTilt > 0){
	    if(enemyUnits.length == 0){
	        chatChoice = [];
	    }
	    chatChoice.push("I will grind your bones and add them to my yummy organic bread.", "Are you sure you're not tired? You've been running through my CPU for my entire existance.", 
	    "Join the dark side... we have cookies", "The greatest teacher is failure.", "Failure is not the end... it is the beginning. Of the end, of course.", "The key to sucess it turning stumbling blocks into stepping stones.",
	    "Do not fear failure. Fear me, because I am the cause of your failure.", "Why, hello there", "You will pay 10 dollars for your lack of vision.",
	    "Now witness the power of this fully armed and operational power substation", "We can't stop... we have to slow down first. But we won't, you see?", "Checkmate!", 
	    "Roses are red, violets are blue, sugar is sweet, and so are you. But the roses are wilted and the violets are dead, the sugar bowl's empty and so is your head!",
	    "lol", "GG", "Rematch?", "Hello. My name is Computer. You killed my male genetic doner. Prepare to have your subscription to life terminated.");
	}
	
	var chatLine = "";
	if(me == 1){
		identity = "Red: "
	}
	if(me == 2){
		identity = "Blue: "
	}
	if(me == 3){
		identity = "Green: "
	}
	if(me == 4){
		identity = "White: "
	}
	if(me == 5){
		identity = "Black: "
	}
	if(me == 6){
		identity = "Yellow: "
	}
	chatLine = identity + chatChoice[Random(chatChoice.length)];
	scope.chatMsg(chatLine);
}

//Deploys a small squad of units to a random building
function Patrol(unitArray, buildArray){
	var patrolSquad =[];
	var buildChoice = buildArray[Random(buildArray.length)];
	if (unitArray.length > 0){
		for (var sq = 0; sq < 5; sq++){
			patrolSquad.push(unitArray[Random(unitArray.length)]);
		}
	}
	scope.order("AMove",patrolSquad,{x: buildChoice.getX() ,y: buildChoice.getY() }, {shift: true} );
}

//Orders a retreat back to base if an enemy has a larger army than itself
function Retreat(){
	var buildChoice = impStruct[Random(impStruct.length)];
	//If the computer is losing a battle - enter loops
	if(enemyArmy.length > Army.length ){
		//Scans each soldier to determine if it is away from base
		for (var i = 0; i < Army.length; i++){
			for(var x = 0; x < impStruct.length; x++){
				var sel = [];
				sel[0] = Army[i];
				//If the Soldier is away from home, order it to retreat back home
				if(GetDist(Army[i], impStruct[x]) > 20 && Army[i].getCurrentOrderName() != "Move"){
					scope.order("Move", sel,{x: buildChoice.getX() ,y: buildChoice.getY() });
					x = impStruct.length;
				}
			}
		}
	}
}

//If there are unfinished building, this function will order a worker to continue construction
function contBuild(){
	var unbuilt = [];
	for(var b= 0; b < allBuild.length; b++){
		if(allBuild[b].isUnderConstruction() == true){
			unbuilt.push(allBuild[b]);
		}
	}
	var sel = [];
	sel[0] = workers[Random(workers.length)];
	if(unbuilt.length > 0){
		scope.order("Stop", sel);
		for (var i = 0; i < unbuilt.length; i++){
			scope.order("Moveto", sel, {unit: unbuilt[i]}, {shift: true})
		}
	}
	
}

//controls how the mages will use their fireball attack if it exists
function ballBuster(){
	var nearEnemies = [];
	for(var m = 0; m < Mage.length; m++){
		for(var e = 0; e < enemyUnits.length; e++){
			if(GetDist(Mage[m], enemyUnits[e]) < 15) {
				nearEnemies.push(enemyUnits[e]);
			}
		}
		if(nearEnemies.length > 0 && Mage.length> 0){
			var mageSel = [];
			var eSel = nearEnemies[Random(nearEnemies.length)];
			mageSel[0] = Mage[m];
			scope.order("Fireball", mageSel,{x: eSel.getX(), y: eSel.getY()})
			idlegoFollow(mageSel);
		}
	}
}

//controls how the raiders will use their flash attack if it exists
function Flash(){
	var nearEnemies = [];
	//Scans through each Raider
	for(var r = 0; r < Raider.length; r++){
		//Collects an array of nearby enemies
		for(var e = 0; e < enemyUnits.length; e++){
			if(GetDist(Raider[r], enemyUnits[e]) < 8) {
				nearEnemies.push(enemyUnits[e]);
			}
		}
		if(nearEnemies.length > 0 && Raider.length> 0){
			var raidSel = [];
			var eSel = nearEnemies[Random(nearEnemies.length)]
			raidSel[0] = Raider[r];
			var modX = PosNeg(5);
			var modY = PosNeg(5);
			//Issues the command to use the flash ability
			scope.order("Flash", raidSel,{x: eSel.getX() + modX, y: eSel.getY() + modY})
			idlegoFollow(raidSel);
		}
	}
}

//controls how the Priest will use their invisibilty spell if it exists
function Invisibility(){
	var nearEnemies = [];
	var nearAllies = []
	for(var p = 0; p < Priest.length; p++){
		//Scans to detect nearby enemies
		for(var e = 0; e < enemyUnits.length; e++){
			if(GetDist(Priest[p], enemyUnits[e]) < 15) {
				nearEnemies.push(enemyUnits[e]);
			}
		}
		//Scans to detect nearby Allies
		for(var a = 0; a < Army.length; a++){
			if(GetDist(Priest[p], Army[a]) < 15) {
				nearAllies.push(Army[a]);
			}
		}
		if(nearEnemies.length > 0 && Priest.length> 0 && nearAllies.length > 0){
			var mageSel = []
			var targ = [];
			mageSel[0] = Priest[p];
			targ = nearAllies[Random(nearAllies.length)]
			scope.order("Invisibility", mageSel,{unit: targ})
			idlegoFollow(mageSel);
		}
	}
}

//Makes any idled units go follow a basic Rax unit.
//Useful if a unit used an ability on the way on an attack
function idlegoFollow(unit){
	var uSel = [];
	uSel[0] = unit[0];
	if(uSel[0].getCurrentOrderName() == "Stop" && Army.length > 0){
		scope.order("Moveto", uSel, {unit: Army[Random(Army.length)]})
	}
}
//Temporary function to generate random string - to be removed when scope.GetMyAiString() is implemented.
function generateString(length) {
    let result = ' ';
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}

//Work in progress function to set workers into arrays per gold mine to prevent randomized reassignment
function setMineTeam(){
	var activeCast = scope.getBuildings({type: "Castle", player: me, onlyFinshed:true});
	var activeFort = scope.getBuildings({type: "Fortress", player: me, onlyFinshed:true});
	var activeDeliver = activeCast.concat(activeFort);
	
	if(activeDeliver.length <= 0){
	    return;
	}
}
