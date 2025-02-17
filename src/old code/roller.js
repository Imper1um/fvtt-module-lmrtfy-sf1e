import { Ceus } from "./ceus.js";

export class CeusRoller extends Application {

    constructor(actors, data) {
        super();
        this.actors = actors;
        this.data = data;
        this.abilities = data.abilities;
        this.saves = data.saves;
        this.skills = data.skills;
        this.advantage = data.advantage;
        this.mode = data.mode;
        this.message = data.message;
        this.tables = data.tables;
        this.chooseOne = data.chooseOne ?? false;
        this.dc = data.dc;

        if (data.title) {
            this.options.title = data.title;
        }

        this.hasMidi = game.modules.get("midi-qol")?.active;
        this.midiUseNewRoller = isNewerVersion(game.modules.get("midi-qol")?.version, "10.0.26");

        Handlebars.registerHelper('canFailAbilityChecks', function (name, ability) {
            if (Ceus.currentRollProvider.canFailChecks()) {
                return `<div>` +
                        `<button type="button" class="ceus-ability-check-fail" data-ability="${ability}" disabled>${game.i18n.localize('Ceus.AbilityCheckFail')} ${game.i18n.localize(name)}</button>` +
                        `<div class="ceus-dice-tray-button enable-ceus-ability-check-fail" data-ability="${ability}" title="${game.i18n.localize('Ceus.EnableChooseFail')}">` +            
                            `${Ceus.d20Svg}` +
                        `</div>` +
                    `</div>`;
            } else {
                return '';
            }
        });

        Handlebars.registerHelper('canFailSaveChecks', function (name, ability) {
            if (Ceus.currentRollProvider.canFailChecks()) {
                return `<div>` +
                        `<button type="button" class="ceus-ability-save-fail" data-ability="${ability}" disabled>${game.i18n.localize('Ceus.SavingThrowFail')} ${game.i18n.localize(name)}</button>` +
                        `<div class="ceus-dice-tray-button enable-ceus-ability-save-fail" data-ability="${ability}" title="${game.i18n.localize('Ceus.EnableChooseFail')}">` +            
                            `${Ceus.d20Svg}` +
                        `</div>` +
                    `</div>`;
            } else {
                return '';
            }
        });

        Handlebars.registerHelper('canFailSkillChecks', function (name, skill) {
            if (Ceus.currentRollProvider.canFailChecks()) {
                return `<div>` +
                        `<button type="button" class="ceus-skill-check-fail" data-skill="${skill}" disabled>${game.i18n.localize('Ceus.SkillCheckFail')} ${game.i18n.localize(name)}</button>` +
                        `<div class="ceus-dice-tray-button enable-ceus-skill-check-fail" data-skill="${skill}" title="${game.i18n.localize('Ceus.EnableChooseFail')}">` +            
                            `${Ceus.d20Svg}` +
                        `</div>` +
                    `</div>`;
            } else {
                return '';
            }
        });
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = game.i18n.localize("Ceus.Title");
        options.template = "modules/ceus/templates/roller.html";
        options.popOut = true;
        options.width = 400;
        options.height = "auto";
        options.classes = ["ceus", "ceus-roller"];
        if (game.settings.get('ceus', 'enableParchmentTheme')) {
          options.classes.push('ceus-parchment');
        }
        return options;
    }

    static requestAbilityChecks(actor, abilities, options={}) {
        if (!actor || !abilities) return;
        if (typeof(abilities) === "string") abilities = [abilities];
        const data = mergeObject(options, {
            abilities: [],
            saves: [],
            skills: []
        }, {inplace: false});
        data.abilities = abilities;
        new CeusRoller([actor], data).render(true);
    }
    static requestSkillChecks(actor, skills, options={}) {
        if (!actor || !skills) return;
        if (typeof(skills) === "string") skills = [skills];
        const data = mergeObject(options, {
            abilities: [],
            saves: [],
            skills: []
        }, {inplace: false});
        data.skills = skills;
        new CeusRoller([actor], data).render(true);
    }
    static requestSavingThrows(actor, saves, options={}) {
        if (!actor || !saves) return;
        if (typeof(saves) === "string") saves = [saves];
        const data = mergeObject(options, {
            abilities: [],
            saves: [],
            skills: []
        }, {inplace: false});
        data.saves = saves;
        new CeusRoller([actor], data).render(true);
    }
	static rollTypes() {
		return {
            ABILITY: "ability",
            SAVE: "save",
            SKILL: "skill",
            PERCEPTION: "perception",
			INITIATIVE: "initiative",
			DEATHSAVE: "deathsave",
			DICE: "dice",
			CUSTOM: "custom"
        };
	}

    async getData() {
        let note = ""
        if (this.advantage == 1)
            note = game.i18n.localize("Ceus.AdvantageNote");
        else if (this.advantage == -1)
            note = game.i18n.localize("Ceus.DisadvantageNote");

        let abilities = {}
        let saves = {}
        let skills = {}
        this.abilities.forEach(a => abilities[a] = Ceus.currentRollProvider.abilities()[a])
        this.saves.forEach(a => saves[a] = Ceus.currentRollProvider.saves()[a])
        this.skills
            .sort((a, b) => {
                const skillA = (Ceus.currentRollProvider.skills()[a]?.label) ? Ceus.currentRollProvider.skills()[a].label : Ceus.currentRollProvider.skills()[a];
                const skillB = (Ceus.currentRollProvider.skills()[b]?.label) ? Ceus.currentRollProvider.skills()[b].label : Ceus.currentRollProvider.skills()[b];
                game.i18n.localize(skillA).localeCompare(skillB)
            })
            .forEach(s => {
                const skill = (Ceus.currentRollProvider.skills()[s]?.label) ? Ceus.currentRollProvider.skills()[s].label : Ceus.currentRollProvider.skills()[s];
                skills[s] = skill;
            });

        const data = {
            actors: this.actors,
            abilities: abilities,
            saves: saves,
            skills: skills,
            note: note,
            message: this.message,
            customFormula: this.data.formula || false,
            deathsave: this.data.deathsave,
            initiative: this.data.initiative,
            perception: this.data.perception,
            tables: this.tables,
            chooseOne: this.chooseOne,
        };

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.element.find(".ceus-ability-check").click(this._onAbilityCheck.bind(this))
        this.element.find(".ceus-ability-save").click(this._onAbilitySave.bind(this))
        this.element.find(".ceus-skill-check").click(this._onSkillCheck.bind(this))
        this.element.find(".ceus-custom-formula").click(this._onCustomFormula.bind(this))
        this.element.find(".ceus-roll-table").click(this._onRollTable.bind(this));
		var specialRolls = Ceus.currentRollProvider.specialRolls();
        if(specialRolls['initiative']) {
            this.element.find(".ceus-initiative").click(this._onInitiative.bind(this))
        }
        if(specialRolls['deathsave']) {
            this.element.find(".ceus-death-save").click(this._onDeathSave.bind(this))
        }
        if(specialRolls['perception']) {
            this.element.find(".ceus-perception").click(this._onPerception.bind(this))
        }

        this.element.find(".enable-ceus-ability-check-fail").click(this._onToggleFailAbilityRoll.bind(this));
        this.element.find(".ceus-ability-check-fail").click(this._onFailAbilityCheck.bind(this));        
        
        this.element.find(".enable-ceus-ability-save-fail").click(this._onToggleFailSaveRoll.bind(this));
        this.element.find(".ceus-ability-save-fail").click(this._onFailAbilitySave.bind(this));    

        this.element.find(".enable-ceus-skill-check-fail").click(this._onToggleFailSkillRoll.bind(this));
        this.element.find(".ceus-skill-check-fail").click(this._onFailSkillCheck.bind(this));    
    }

    _checkClose() {
        if (this.element.find("button").filter((i, e) => !e.disabled).length === 0 || this.chooseOne) {
            this.close();
        }
    }

    _disableButtons(event) {
        event.currentTarget.disabled = true;

        if (Ceus.canFailChecks) {
            const buttonSelector = `${event.currentTarget.className}`;
            let oppositeSelector = "";
            let dataSelector = "";

            if (
                event.currentTarget.className.indexOf('ability-check') > 0 || 
                event.currentTarget.className.indexOf('ability-save') > 0
            ) {
                dataSelector = `[data-ability *= '${event?.currentTarget?.dataset?.ability}']`;
            } else {
                dataSelector = `[data-skill *= '${event?.currentTarget?.dataset?.skill}']`;
            }

            if (event.currentTarget.className.indexOf('fail') > 0) {
                oppositeSelector = event.currentTarget.className.substring(0, event.currentTarget.className.indexOf('fail') - 1);
            } else {
                oppositeSelector = `${event.currentTarget.className}-fail`;            
            }

            const enableButton = document.querySelector(`.enable-${buttonSelector}${dataSelector}`);
            if (enableButton) {
                enableButton.disabled = true;
                enableButton.classList.add('disabled-button');
            }

            const oppositeButton = document.querySelector(`.${oppositeSelector}${dataSelector}`);
            if (oppositeButton) oppositeButton.disabled = true;
        }
    }

    _getRollOptions(event, failRoll) {
        let options;
        switch(this.advantage) {
            case -1:
                options = {... Ceus.currentRollProvider.disadvantageRollEvent() };
                break;
            case 0:
                options = {... Ceus.currentRollProvider.normalRollEvent() };
                break;
            case 1:
                options = {... Ceus.currentRollProvider.advantageRollEvent() };
                break;
            case 2:
                options = { event: event };
                break;
        }

        if (failRoll) {
            options["parts"] = [-100];
        }

        return options;
    }

    async _makeRoll(event, rollMethod, rolledType, failRoll, ...args) {
        let options = this._getRollOptions(event, failRoll);                

        // save the current roll mode to reset it after this roll
        const rollMode = game.settings.get("core", "rollMode");
        game.settings.set("core", "rollMode", this.mode || CONST.DICE_ROLL_MODES);

        for (let actor of this.actors) {
            Hooks.once("preCreateChatMessage", this._tagMessage.bind(this));

			if (Ceus.currentRollProvider.handleCustomRoll(actor, event, rollMethod, rolledType, failRoll, this.dc, args)) {
				continue;
			}
			
			await actor[rollMethod].call(actor, ...args, options);
        }

        game.settings.set("core", "rollMode", rollMode);

        this._disableButtons(event);
        this._checkClose();
    }

    _makePF2EInitiativeRoll(event) {
        // save the current roll mode to reset it after this roll
        const rollMode = game.settings.get("core", "rollMode");
        game.settings.set("core", "rollMode", this.mode || CONST.DICE_ROLL_MODES);

        for (let actor of this.actors) {
            const initiative = actor.data.data.attributes.initiative;
            const rollNames = ['all', 'initiative'];
            if (initiative.ability === 'perception') {
                rollNames.push('wis-based');
                rollNames.push('perception');
            } else {
                const skill = actor.data.data.skills[initiative.ability];
                rollNames.push(`${skill.ability}-based`);
                rollNames.push(skill.name);
            }
            const options = actor.getRollOptions(rollNames);
            initiative.roll({ event, options });
        }

        game.settings.set("core", "rollMode", rollMode);

        event.currentTarget.disabled = true;
        this._checkClose();
    }

    _tagMessage(candidate, data, options) {
        candidate.updateSource({"flags.ceus": {"message": this.data.message, "data": this.data.attach, "blind": candidate.blind}});
    }

    async _makeDiceRoll(event, formula, defaultMessage = null) {
        if (formula.startsWith("1d20")) {
            if (this.advantage === 1)
                formula = formula.replace("1d20", "2d20kh1")
            else if (this.advantage === -1)
                formula = formula.replace("1d20", "2d20kl1")
        }

        const messageFlag = {"message": this.data.message, "data": this.data.attach};

        const rollMessages = [];
        const rollMessagePromises = this.actors.map(async (actor) => {
            const speaker = ChatMessage.getSpeaker({actor: actor});

            const rollData = actor.getRollData();
            const roll = new Roll(formula, rollData);
            const rollMessageData = await roll.toMessage(
                {"flags.ceus": messageFlag},
                {rollMode: this.mode, create: false},
            );

            rollMessages.push(
                mergeObject(
                    rollMessageData,
                    {
                        speaker: {
                            alias: speaker.alias,
                            scene: speaker.scene,
                            token: speaker.token,
                            actor: speaker.actor,
                        },
                        flavor: this.message || defaultMessage,
                        rollMode: this.mode,
                    },
                ),
            );
        })

        await Promise.allSettled(rollMessagePromises);
        await ChatMessage.create(rollMessages, {rollMode: this.mode});

        event.currentTarget.disabled = true;
        this._checkClose();
    }

    _drawTable(event, table) {
        const icons = {
            Actor: 'fas fa-user',
            Item: 'fas fa-suitcase',
            Scene: 'fas fa-map',
            JournalEntry: 'fas fa-book-open',
            Macro: 'fas fa-terminal',
            Playlist: '',
            Compendium: 'fas fa-atlas',
        }

        let chatMessages = [];
        let count = 0;
        const rollTable = game.tables.getName(table);

        if (rollTable) {
            for (let actor of this.actors) {
                rollTable.draw({ displayChat: false }).then((res) => {
                    count++;
                    const rollResults = res.results;

                    const nr = rollResults.length > 1 ? `${rollResults.length} results` : "a result";
                    let content = "";

                    for (const rollResult of rollResults) {
                        const result = rollResult;

                        if (!result.documentCollection) {
                            content += `<p>${result.text}</p>`;
                        } else if (['Actor', 'Item', 'Scene', 'JournalEntry', 'Macro'].includes(result.documentCollection)) {
                            content += `<p><a class="content-link" draggable="true" data-entity="${result.documentCollection}" data-uuid="${result.documentCollection}.${result.documentId}">
                                <i class="${icons[result.documentCollection]}"></i> ${result.text}</a></p>`;
                        } else if (result.documentCollection === 'Playlist') {
                            content += `<p>@${result.documentCollection}[${result.documentId}]{${result.text}}</p>`;
                        } else if (result.documentCollection) { // if not specific collection, then is compendium
                            content += `<p><a class="content-link" draggable="true" data-pack="${result.documentCollection}" data-uuid="${result.documentCollection}.${result.documentId}">
                                <i class="${icons[result.documentCollection]}"></i> ${result.text}</a></p>`;
                        }
                    }
                    let chatData = {
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker({actor}),
                        flavor: `Draws ${nr} from the ${table} table.`,
                        content: content,
                        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    };

                    if ( ["gmroll", "blindroll"].includes(this.mode) ) {
                        chatData.whisper = ChatMessage.getWhisperRecipients("GM");
                    }
                    if ( this.mode === "selfroll" ) chatData.whisper = [game.user.id];
                    if ( this.mode === "blindroll" ) chatData.blind = true;

                    setProperty(chatData, "flags.ceus", {"message": this.data.message, "data": this.data.attach, "blind": chatData.blind});

                    chatMessages.push(chatData);

                    if (count === this.actors.length) {
                        ChatMessage.create(chatMessages, {});

                        event.currentTarget.disabled = true;
                        this._checkClose();
                    }
                });
            }
        }
    }

    _onAbilityCheck(event) {
        event.preventDefault();
        const ability = event.currentTarget.dataset.ability;
        
        // until patching has been removed
        if (!this.hasMidi || this.midiUseNewRoller) {
            this._makeRoll(event, Ceus.currentRollProvider.abilityRollMethod(), CeusRoller.rollTypes().ABILITY, false, ability);
        } else {
            this._makeRoll(event, Ceus.currentRollProvider.abilityRollMethod(), CeusRoller.rollTypes().ABILITY, ability);
        }
    }

    _onFailAbilityCheck(event) {
        event.preventDefault();
        const ability = event.currentTarget.dataset.ability;

        // until patching has been removed
        if (!this.hasMidi || this.midiUseNewRoller) {
            this._makeRoll(event, Ceus.currentRollProvider.abilityRollMethod(), CeusRoller.rollTypes().ABILITY, true, ability);
        } else {
            this._makeRoll(event, Ceus.currentRollProvider.abilityRollMethod(), CeusRoller.rollTypes().ABILITY, ability);
        }
    }

    _onAbilitySave(event) {
        event.preventDefault();
        const saves = event.currentTarget.dataset.ability;
        
        // until patching has been removed
        if (!this.hasMidi || this.midiUseNewRoller) {
            this._makeRoll(event, Ceus.currentRollProvider.saveRollMethod(), CeusRoller.rollTypes().SAVE, false, saves);
        } else {
            this._makeRoll(event, Ceus.currentRollProvider.saveRollMethod(), CeusRoller.rollTypes().SAVE, saves);
        }
    }

    _onFailAbilitySave(event) {
        event.preventDefault();
        const saves = event.currentTarget.dataset.ability;

        // until patching has been removed
        if (!this.hasMidi || this.midiUseNewRoller) {
            this._makeRoll(event, Ceus.currentRollProvider.saveRollMethod(), CeusRoller.rollTypes().SAVE, true, saves);
        } else {
            this._makeRoll(event, Ceus.currentRollProvider.saveRollMethod(), CeusRoller.rollTypes().SAVE, saves);
        }
    }

    _onSkillCheck(event) {
        event.preventDefault();
        const skill = event.currentTarget.dataset.skill;

        // until patching has been removed
        if (!this.hasMidi || this.midiUseNewRoller) {
            this._makeRoll(event, Ceus.currentRollProvider.skillRollMethod(), CeusRoller.rollTypes().SKILL, false, skill);
        } else {
            this._makeRoll(event, Ceus.currentRollProvider.skillRollMethod(), CeusRoller.rollTypes().SKILL, skill);
        }
    }

    _onFailSkillCheck(event) {
        event.preventDefault();
        const skill = event.currentTarget.dataset.skill;

        // until patching has been removed
        if (!this.hasMidi || this.midiUseNewRoller) {
            this._makeRoll(event, Ceus.currentRollProvider.skillRollMethod(), CeusRoller.rollTypes().SKILL, true, skill);
        } else {
            this._makeRoll(event, Ceus.currentRollProvider.skillRollMethod(), CeusRoller.rollTypes().SKILL, skill);
        }
    }

    async _onCustomFormula(event) {
        event.preventDefault();
        await this._makeDiceRoll(event, this.data.formula);
    }

    _onInitiative(event) {
        event.preventDefault();

		//Custom Event Handling for Initiative Rolls (if needed)
		var initRollHandling = Ceus.currentRollProvider.handleInitiativeRoll(event, this.mode, this.actors);
		if (initRollHandling && initRollHandling.isHandled) {
			if (initRollHandling.checkClose) {
				this._checkClose();
			}
			return;
		}
		
		if (this.data.initiative) {
			for (let actor of this.actors) {
				actor.rollInitiative();
			}
			event.currentTarget.disabled = true;
			this._checkClose();
		} else {
			const initiative = CONFIG.Combat.initiative.formula || game.system.data.initiative;
			this._makeDiceRoll(event, initiative, game.i18n.localize("Ceus.InitiativeRollMessage"));
		}
    }

    _onDeathSave(event) {
        event.preventDefault();
		
		var deathSaveHandling = Ceus.currentRollProvider.handleDeathSave(this.actors, event);
		if (deathSaveHandling && deathSaveHandling.isHandled) {
			if (deathSaveHandling.checkClose) {
				this._checkClose();
			}
			return;
		}
		this._makeDiceRoll(event, "1d20", game.i18n.localize("Ceus.DeathSaveRollMessage"));
    }

    _onPerception(event) {
        event.preventDefault();
        this._makeDiceRoll(event, `1d20 + @attributes.perception.totalModifier`, game.i18n.localize("Ceus.PerceptionRollMessage"));
    }

    _onRollTable(event) {
        event.preventDefault();
        const table = event.currentTarget.dataset.table;
        this._drawTable(event, table);
    }

    _onToggleFailAbilityRoll(event) {
        event.preventDefault();
        if (event.currentTarget.classList.contains('disabled-button')) return;

        const failButton = document.querySelector(`.ceus-ability-check-fail[data-ability *= '${event?.currentTarget?.dataset?.ability}']`);
        if (failButton) failButton.disabled = !failButton.disabled;

        const normalButton = document.querySelector(`.ceus-ability-check[data-ability *= '${event?.currentTarget?.dataset?.ability}']`);
        if (normalButton) normalButton.disabled = !normalButton.disabled;
    }

    _onToggleFailSaveRoll(event) {
        event.preventDefault();
        if (event.currentTarget.classList.contains('disabled-button')) return;

        const failButton = document.querySelector(`.ceus-ability-save-fail[data-ability *= '${event?.currentTarget?.dataset?.ability}']`);
        if (failButton) failButton.disabled = !failButton.disabled;

        const normalButton = document.querySelector(`.ceus-ability-save[data-ability *= '${event?.currentTarget?.dataset?.ability}']`);
        if (normalButton) normalButton.disabled = !normalButton.disabled;
    }

    _onToggleFailSkillRoll(event) {
        event.preventDefault();
        if (event.currentTarget.classList.contains('disabled-button')) return;

        const failButton = document.querySelector(`.ceus-skill-check-fail[data-skill *= '${event?.currentTarget?.dataset?.skill}']`);
        if (failButton) failButton.disabled = !failButton.disabled;

        const normalButton = document.querySelector(`.ceus-skill-check[data-ability *= '${event?.currentTarget?.dataset?.ability}']`);
        if (normalButton) normalButton.disabled = !normalButton.disabled;
    }
}

console.log("Ceus | roller.js loaded");