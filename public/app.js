$(function() {
	// Wrap jQuery's promise implementation with Bluebird
	function $ajax() {
		var promise = $.ajax.apply($, arguments).promise();
		return Promise.resolve(promise).catch(function(res) {
			var error = _.assign(new Error(), res.responseJSON);
			throw error;
		});
	}

	var actions = {
		getAll: function() {
			return $ajax({ type: 'get', url: '/card' });
		},
		getOne: function(id) {
			return $ajax({ type: 'get', url: '/card/' + id });
		},
		post: function(json) {
			return $ajax({ type: 'post', url: '/card', data: json });
		},
		delete: function(id) {
			return $ajax({ type: 'delete', url: '/card/' + id });
		}
	};

	var selectedCardId = null;
	var $cardListContainer = $('#card-list-container');
	var $cardDetailContainer = $('#card-detail-container');
	var createTemplate = _.flow(function(string) {
		// remove white space from the template string
		return string.replace(/(\r?\n|\t|\s{2,})+/gm, '');
	}, _.template);

	var emptyListTemplate = createTemplate('\
		<div class="list-group-item">\
			<em class="text-muted">No saved cards found</em>\
		</div>\
	');

	var miniCardTemplate = createTemplate('\
		<a href="#" data-id="<%= id %>" class="list-group-item mini-card">\
			<%= title %>\
		</a>\
	');

	var fullCardTemplate = createTemplate('\
		<div class="panel panel-default full-card">\
			<div class="panel-heading">\
				<span class="panel-title bold">\
					<%= title %>\
				</span>\
				<a href="#" class="close">x</a>\
			</div>\
			<div class="panel-body">\
				<div class="card-body">\
					<%= body %>\
				</div>\
			</div>\
			<div class="panel-footer">\
				<button class="btn btn-danger btn-sm delete">\
					<i class="glyphicon glyphicon-trash"></i>\
				</button>\
			</div>\
		</div>\
	');

	// Log the stack trace and trigger an alert on unhandled exception
	Promise.onPossiblyUnhandledRejection(function(error) {
		console.error(error.stack);
		alert('Uh-oh! Something went wrong. Check the console for details');
	});

	function createEmptyListElement() {
		return $(emptyListTemplate());
	}

	function createMiniCard(data) {
		var $card = $(miniCardTemplate(data));
		$card.on('click', function(event) {
			event.preventDefault();
			if (selectedCardId === data.id) {
				clearSelectedCard();
			} else {
				showFullCard(data.id);
			}
			$(this).blur();
		});
		return $card;
	}

	function createFullCard(data) {
		var $card = $(fullCardTemplate(data));
		$card.find('.close').on('click', function(e) {
			e.preventDefault();
			clearSelectedCard();
			$(this).blur();
		});
		$card.find('.delete').on('click', function() {
			$(this).blur();
			if (confirm('Are you sure?')) {
				actions.delete(data.id).then(function() {
					clearSelectedCard();
					return updateCardList();
				});
			}
		});
		return $card;
	}

	function updateCardList() {
		// fetch the full list of cards from the server
		return actions.getAll().then(function(cards) {
			// clear the container element
			$cardListContainer.empty();

			if (cards.length < 1) {
				return $cardListContainer.append(createEmptyListElement());
			}

			// iterate over the array of card objects, create
			// an element, and append it to the list.
			_.forEach(cards, function(card) {
				$cardListContainer.append(createMiniCard(card));
			});

			if (_.isNumber(selectedCardId)) {
				return showFullCard(selectedCardId);
			}
		});
	}

	function showFullCard(id) {
		return actions.getOne(id).then(function(card) {
			// deactivate any active elements in the card list
			// and remove the full card element
			clearSelectedCard();

			// set selectedCardId
			selectedCardId = id;

			// create the full card element and append it to the card detail container
			var $card = createFullCard(card);
			$cardDetailContainer.empty().append($card);

			// activate the selected card in the list
			$cardListContainer.find('*[data-id=' + selectedCardId + ']').addClass('active');
		});
	}

	function clearSelectedCard() {
		selectedCardId = null;
		$cardListContainer
			.find('.active')
			.removeClass('active');
		$cardDetailContainer.empty();
	}

	// fetch the card list when the page initially loads
	updateCardList();

	$('#refresh-cards').on('click', function(event) {
		event.preventDefault();
		updateCardList();
		$(this).blur();
	});

	$('#new-card-form').on('submit', function(event) {
		var form = this;

		// prevent the browser from handling the submit event
		event.preventDefault();

		// transform the form data to a json object
		var data = $(form).serializeArray();
		var json = _(data)
			.map(function(field) {
				return [field.name, field.value];
			})
			.fromPairs()
			.value();

		// send the json payload to the server to create a new card,
		// then fetch and update the card list.
		actions
			.post(json)
			.then(function() {
				form.reset(); // reset the form fields
			})
			.then(function() {
				updateCardList();
			});
	});
});
