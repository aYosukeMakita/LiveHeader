# Privacy Policy / プライバシーポリシー

Effective date: November 7, 2026

## English

LiveHeader is a Chrome extension that lets users configure custom HTTP request and response headers and apply them to matching traffic.

### Information stored locally

LiveHeader stores the following settings in Chrome's local extension storage (`chrome.storage.local`): profile names and enabled states; user-entered request and response header names and values; URL patterns and HTTP methods; and the ID of the selected profile.

The extension does not create or store a browsing-history log, page titles, access times, page contents, or cookies. Chrome's Declarative Net Request engine evaluates current request URLs and methods against the rules configured by the user so that matching rules can be applied. These URLs are not sent to the publisher or recorded by LiveHeader.

### How information is used and shared

Request header values configured by the user are added to matching requests and sent to the destination websites. Response header values are applied to matching responses in the browser. Do not enter a value unless you intend it to be used in this way. In particular, use URL patterns carefully and prefer HTTPS when sending sensitive values.

LiveHeader does not transmit profiles, header values, matched URLs, or other browsing data to the publisher's servers. The extension does not include analytics, advertising, or remote-code features.

### Retention and deletion

Settings remain in Chrome's local extension storage until the user deletes the relevant profiles or removes the extension. Users can delete profiles from the LiveHeader popup.

### Permissions

- `declarativeNetRequest` is used to apply the user's header rules to matching requests and responses.
- `storage` is used to save and restore profiles and settings locally.
- `<all_urls>` host access allows users to create URL filters for any website. Headers are applied according to the enabled profiles and their filters; a profile with no enabled filters applies to all requests.

### Contact

For privacy questions, contact the publisher through the [LiveHeader GitHub repository](https://github.com/aYosukeMakita/LiveHeader/issues). Do not include passwords, tokens, or header values in public issues.

## 日本語

LiveHeaderは、利用者が設定したカスタムHTTPリクエストヘッダーおよびレスポンスヘッダーを、条件に一致する通信に適用するChrome拡張機能です。

### 端末内に保存する情報

LiveHeaderは、プロファイル名と有効状態、利用者が入力したリクエスト・レスポンスヘッダー名および値、URLパターン、HTTPメソッド、選択中のプロファイルIDを、Chromeのローカル拡張機能ストレージ（`chrome.storage.local`）に保存します。

LiveHeaderは、閲覧履歴の一覧、ページタイトル、アクセス時刻、ページ内容、Cookieを記録・保存しません。設定されたルールを適用するため、ChromeのDeclarative Net Requestエンジンが、現在のリクエストURLとHTTPメソッドを利用者の設定した条件と照合します。この照合URLを開発者へ送信したり、LiveHeader内に記録したりすることはありません。

### 情報の利用と共有

利用者が設定したリクエストヘッダー値は、一致するリクエストに付加され、送信先のウェブサイトへ送信されます。レスポンスヘッダー値は、ブラウザー内で一致するレスポンスに適用されます。このような利用を意図した値だけを設定してください。特にURLパターンをよく確認し、機密情報を送る場合はHTTPSのサイトを使用してください。

LiveHeaderは、プロファイル、ヘッダー値、一致したURL、その他の閲覧データを開発者のサーバーへ送信しません。アクセス解析、広告、リモートコード実行の機能もありません。

### 保存期間と削除

設定は、利用者が該当するプロファイルを削除するか、拡張機能を削除するまでChromeのローカル拡張機能ストレージに保存されます。プロファイルはLiveHeaderのポップアップから削除できます。

### 権限

- `declarativeNetRequest` は、利用者が設定したヘッダールールを一致するリクエストやレスポンスに適用するために使用します。
- `storage` は、プロファイルや設定を端末内に保存・復元するために使用します。
- `<all_urls>` ホスト権限は、利用者が任意のウェブサイト向けにURLフィルターを作成できるようにするために必要です。ヘッダーは有効なプロファイルとフィルターに従って適用されます。有効なフィルターがないプロファイルは、すべてのリクエストに適用されます。

### お問い合わせ

プライバシーに関するお問い合わせは、[LiveHeaderのGitHubリポジトリ](https://github.com/aYosukeMakita/LiveHeader/issues)からご連絡ください。公開Issueにパスワード、トークン、ヘッダー値などを書き込まないでください。

We may update this policy when the extension's functionality or data practices change. Changes will be published on this page.

拡張機能の機能またはデータの取り扱いに変更があった場合、このポリシーを更新し、このページでお知らせします。