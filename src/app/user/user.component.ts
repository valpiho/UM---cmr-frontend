import {Component, OnInit} from '@angular/core';
import {BehaviorSubject, Subscription} from "rxjs";
import {User} from "../model/user";
import {UserService} from "../service/user.service";
import {NotificationService} from "../service/notification.service";
import {NotificationType} from "../enum/notification-type.enum";
import {HttpErrorResponse} from "@angular/common/http";
import {NgForm} from "@angular/forms";
import {CustomHttpResponse} from "../model/custom-http-response";

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  private titleSubject = new BehaviorSubject<string>('Users');
  public titleAction$ = this.titleSubject.asObservable();
  public refreshing: boolean;

  public fileName: string;
  public profileImage: File;
  public selectedUser: User;
  public users: User[];
  private subscriptions: Subscription[] = [];

  public editUser = new User();
  private currentUsername: string;

  constructor(private userService: UserService,
              private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.getUsers(true);
  }

  public changeTitle(title: string): void {
    this.titleSubject.next(title);
  }

  public getUsers(showNotification: boolean): void {
    this.refreshing = true;
    this.subscriptions.push(
      this.userService.getUsers().subscribe(
        (response: User[]) => {
          this.userService.addUsersToLocalCache(response);
          this.users = response;
          this.refreshing = false;
          if (showNotification) {
            this.sendNotification(NotificationType.SUCCESS, `${response.length} user(s) loaded successfully`);
          }
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.refreshing = false;
        }
      )
    );
  }

  public onSelectUser(selectedUser: User): void {
    this.selectedUser = selectedUser;
    UserComponent.clickButton('openUserInfo')
  }

  public onProfileImageChange(fileName: string, profileImage: File): void {
    this.fileName = fileName;
    this.profileImage = profileImage;
  }

  public saveNewUser(): void {
    UserComponent.clickButton('new-user-save')
  }

  public onAddNewUser(userForm: NgForm): void {
    const formData = this.userService.createUserFormData(null, userForm.value, this.profileImage);
    this.subscriptions.push(
      this.userService.addUser(formData).subscribe(
        (response: User) => {
          UserComponent.clickButton('new-user-close');
          this.getUsers(false);
          this.fileName = null;
          this.profileImage = null;
          userForm.reset();
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} added successfully`);
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
        }
      )
    );
  }

  public searchUsers(searchTherm: string): void {
    const results: User[] = [];
    for (const user of this.userService.getUsersFromLocalCache()) {
      if (user.firstName.toLowerCase().indexOf(searchTherm.toLowerCase()) !== -1 ||
        user.lastName.toLowerCase().indexOf(searchTherm.toLowerCase()) !== -1 ||
        user.username.toLowerCase().indexOf(searchTherm.toLowerCase()) !== -1 ||
        user.userId.toLowerCase().indexOf(searchTherm.toLowerCase()) !== -1) {
        results.push(user);
      }
    }
    this.users = results;
    if (results.length == 0 || !searchTherm) {
      this.users = this.userService.getUsersFromLocalCache();
    }
  }

  public onEditUser(editUser: User): void {
    this.editUser = editUser;
    this.currentUsername = editUser.username;
    UserComponent.clickButton('openUserEdit')
  }

  public onUpdateUser(): void {
    const formData = this.userService.createUserFormData(this.currentUsername, this.editUser, this.profileImage);
    this.subscriptions.push(
      this.userService.updateUser(formData).subscribe(
        (response: User) => {
          UserComponent.clickButton('closeEditUserModalButton');
          this.getUsers(false);
          this.fileName = null;
          this.profileImage = null;
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} updated successfully`);
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
        }
      )
    );
  }

  public onDeleteUser(userId: number): void {
    this.subscriptions.push(
      this.userService.deleteUser(userId).subscribe(
        (response:CustomHttpResponse) => {
          this.sendNotification(NotificationType.SUCCESS, response.message);
          this.getUsers(false);
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
        }
      )
    )
  }

  public onResetPassword(emailForm: NgForm): void {
    this.refreshing = true;
    const emailAddress = emailForm.value['reset-password-email'];
    this.subscriptions.push(
      this.userService.resetPassword(emailAddress).subscribe(
        (response: CustomHttpResponse) => {
          this.sendNotification(NotificationType.SUCCESS, response.message);
          this.refreshing = false;
        },
        (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.refreshing = false;
        },
        () => emailForm.reset()
      )
    );
  }

  private sendNotification(notificationType: NotificationType, message: string) {
    if (message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(notificationType, 'AN ERROR OCCURRED. PLEASE TRY AGAIN');
    }
  }

  private static clickButton(buttonId: string): void {
    document.getElementById(buttonId).click();
  }
}
