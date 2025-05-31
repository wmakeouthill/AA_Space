import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RewardListComponent } from './components/reward-list/reward-list.component';
import { GrantRewardComponent } from './components/grant-reward/grant-reward.component';

const routes: Routes = [
  {
    path: '',
    component: RewardListComponent // Default component for the module
  },
  {
    path: 'grant',
    component: GrantRewardComponent
  },
  // Potentially add a route for viewing/editing a specific reward, e.g., path: 'edit/:id'
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RewardManagementRoutingModule { }
