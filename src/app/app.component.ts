import { Component } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  noHeader = false;

  constructor(private router: Router, private route: ActivatedRoute) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const deepest = this.getDeepestChild(this.route);
        this.noHeader = !!deepest.snapshot.data['noHeader'];
      });
  }

  private getDeepestChild(ar: ActivatedRoute): ActivatedRoute {
    let r = ar;
    while (r.firstChild) r = r.firstChild;
    return r;
  }
}
