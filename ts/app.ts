/// <reference path="../typings/angular2/angular2.d.ts" />
import {Component, View, bootstrap, ChangeDetection, DynamicChangeDetection}
    from 'angular2/angular2';
import { bind } from 'angular2/di';
import CameraManagerComponent from 'components/camera-manager/component';
import ConnectionManagerComponent
    from 'components/connection-manager/component';
import {StringValidator} from 'classes/module';

@Component({
  selector: 'fxos-remote-daemon'
})

@View({
  template: `
    <h1>Hello {{ name }}</h1>
    <camera-manager></camera-manager>
    <connection-manager></connection-manager>
  `,
  directives: [CameraManagerComponent, ConnectionManagerComponent]
})

class AppComponent {
  name: string;

  constructor() {
    this.name = 'Alice and Bob';
  }
}

bootstrap(
  AppComponent, [bind(ChangeDetection).toClass(DynamicChangeDetection)]
);