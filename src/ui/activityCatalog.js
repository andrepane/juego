const statusLabels = { available: 'Disponible', 'coming-soon': 'Próximamente' };

function renderCard(activity) {
  const available = activity.status === 'available';
  return `<button class="activity-card ${available ? 'active-card' : 'coming'}" type="button" data-activity-id="${activity.id}" data-status="${activity.status}"${available ? '' : ' disabled'}><span class="card-icon" aria-hidden="true">${activity.icon}</span><strong>${activity.title}</strong><span>${activity.shortDescription}</span><b>${statusLabels[activity.status]}</b></button>`;
}

export function renderActivityCatalog(container, registry) {
  container.innerHTML = registry.listByArea().map(area => `<section class="activity-area" aria-labelledby="area-${area.id}"><header><h2 id="area-${area.id}">${area.title}</h2>${area.description ? `<p>${area.description}</p>` : ''}</header><div class="cards">${area.activities.map(renderCard).join('')}</div></section>`).join('');
}

export function bindActivityCatalog(container, onSelectActivity) {
  container.addEventListener('click', (event) => {
    const card = event.target.closest('[data-activity-id]');
    if (!card || card.disabled || card.dataset.status !== 'available') return;
    onSelectActivity(card.dataset.activityId);
  });
}
