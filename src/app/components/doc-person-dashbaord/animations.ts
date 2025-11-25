import { trigger, state, style, transition, animate, query, stagger, keyframes } from '@angular/animations';

/**
 * Angular animation definitions for doc-person-dashboard
 */

export const slideInAnimation = trigger('slideIn', [
    transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
    ])
]);

export const fadeInAnimation = trigger('fadeIn', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 }))
    ]),
    transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
    ])
]);

export const scaleInAnimation = trigger('scaleIn', [
    transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1)', opacity: 1 }))
    ])
]);

export const staggerListAnimation = trigger('staggerList', [
    transition('* <=> *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateY(20px)' }),
            stagger('100ms', [
                animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ], { optional: true })
    ])
]);

export const bounceAnimation = trigger('bounce', [
    transition(':enter', [
        animate('600ms', keyframes([
            style({ transform: 'translateY(0)', offset: 0 }),
            style({ transform: 'translateY(-15px)', offset: 0.5 }),
            style({ transform: 'translateY(0)', offset: 1 })
        ]))
    ])
]);

export const slideUpAnimation = trigger('slideUp', [
    transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('500ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
    ])
]);

export const modalAnimation = trigger('modalAnimation', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms ease-out', style({ opacity: 1 }))
    ]),
    transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
    ])
]);

export const drawerAnimation = trigger('drawerAnimation', [
    transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
    ])
]);

// Counter animation for numbers
export const countUpAnimation = trigger('countUp', [
    transition('* => *', [
        animate('800ms cubic-bezier(0.34, 1.56, 0.64, 1)')
    ])
]);
