import { BaseComponent, } from './app/ts/base.component';
import { RacerComponent } from './app/ts/racer.component';
import { DataService } from './app/ts/data.service';
import { DialogComponent } from './app/ts/dialog'
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DemoMaterialModule } from './demomateroial.module';
import { MatNativeDateModule } from '@angular/material';

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpModule,
    HttpClientModule,
    DemoMaterialModule,
    MatNativeDateModule,
    ReactiveFormsModule,
  ],
  entryComponents: [BaseComponent, DialogComponent],
  declarations: [
    BaseComponent,
    RacerComponent,
    DialogComponent
  ],
  bootstrap: [BaseComponent],
  providers: [
    DataService
  ]
})
export class AppModule { }

