import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, style, animate, transition, stagger, query } from '@angular/animations';



@Component({
  selector: 'app-home-portal',
  templateUrl: './home.html',
  standalone: false,
  styleUrls: ['./home.css'],
  animations: [

    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerCards', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(30px) scale(0.95)' }),
          stagger(100, [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', 
              style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]

})
export class Home implements OnInit {

    changeDetection!: ChangeDetectionStrategy.OnPush;// Use OnPush for better performance
 currentTime = signal(new Date());
  isLoading = signal(false);
  private timerId: any;

  // --- Dependency Injection ---
  private router = inject(Router);

  // --- Lifecycle Hooks ---
  ngOnInit() {
    // Update the time every second
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    // Clean up the interval when the component is destroyed
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  // --- Public Methods ---
  navigateTo(path: string) {
    this.isLoading.set(true);

    // Simulate a network request (e.g., 1 second)
    setTimeout(() => {
      // In a real app, the spinner would be hidden automatically
      // by the router navigation, but we'll manually set it
      // for this demo in case navigation is instant.
      
      // Note: We don't hide the spinner here.
      // It will hide when the new route/component loads.
      // If the new component doesn't load for some reason,
      // you might want a more robust error-handling state.
      this.router.navigate([path]);

      // As a fallback, hide spinner after navigation starts
      // This is a failsafe for the demo environment.
      setTimeout(() => this.isLoading.set(false), 200);

    }, 1000); // 1-second delay
  }
}