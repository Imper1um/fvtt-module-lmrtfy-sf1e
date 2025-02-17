import { ceus_RollProvider } from "./ceus_RollProvider.js";

export class ceus_RollProvider_dnd5e extends ceus_RollProvider {
	systemIdentifiers() {
		return 'dnd5e';
	}
	abilities() {
		return this.create5eAbilities();
	}

	abilityAbbreviations() {
		return this.create5eAbilities();
	}

	abilityRollMethod() {
		return 'rollAbilityTest';
	}

	advantageRollEvent() {
		var dre = new ceus_RollEvent(false, true, false, true);
		dre.advantage = true;
		return dre;
	}
	
	allowFailButtons() {
		return true;
	}

	disadvantageRollEvent() {
		var dre = new ceus_RollEvent(false, false, true, true);
		dre.disadvantage = true;
		return dre;
		
	}
	
	failButtonsDefault() {
		return true;
	}
	
	handleDeathSave(actors, event) {
		for (let actor of actors) {
			actor.rollDeathSave(event);
		}
		event.currentTarget.disabled = true;
		return {isHandled: true, checkClose: true};
	}

	normalRollEvent() {
		return new ceus_RollEvent(true, false, false, true);
	}

	saveRollMethod() {
		return 'rollAbilitySave';
	}

	saves() {
		return this.create5eAbilities();
	}

	skills() {
		return CONFIG.DND5E.skills;
	}

	specialRolls() {
		return {'initiative': true, 'deathsave': true};
	}

	create5eAbilities() {
        let abbr = {};
        
        for (let key in CONFIG.DND5E.abilities) { 
            let abb = game.i18n.localize(CONFIG.DND5E.abilities[key].abbreviation);
            let upperFirstLetter = abb.charAt(0).toUpperCase() + abb.slice(1);
            abbr[`${abb}`] = `DND5E.Ability${upperFirstLetter}`;
        }
		
		

        return abbr;
    }
	
	parseAbilityModifiers() {
        let abilityMods = super.parseAbilityModifiers();

        abilityMods['attributes.prof'] = 'DND5E.Proficiency';

        return abilityMods;
    }
}