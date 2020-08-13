# node-red-contrib-syslog-input

A simple contributed Node-RED node, for receiving remote logging messages using the ubiquitous [syslog](https://www.networkmanagementsoftware.com/what-is-syslog/) event logging protocol.

## Overview
The goal of this software is to make it easy for home IOT mavericks to respond to almost any computer system software event via the awesome [Node-RED Framework](https://nodered.org/ "Node Red").

[Syslog](https://www.ittsystems.com/what-is-syslog/ "What is Syslog") is a ubiquitous network protocol for remotely logging computer events. It is implemented on a diverse range of networking devices, such as GNU/Linux servers, firewalls, printers, web-servers and internet routers. It can also be installed on Windows-based computers.

By configuring your devices to send event messages to your Node Red installation, this node can receive these messages and allow you to create flows that process and respond to them.

## Installation

Install `node-red-contrib-syslog-input` by following the [adding nodes](http://nodered.org/docs/getting-started/adding-nodes "adding nodes") instructions from the [Node-RED Getting Started Documentation](http://nodered.org/docs/getting-started/ "Getting Started"). 

Or if you have command line access and TL;DR, using [npm](https://www.npmjs.com/ "npm") as the user running Node-RED type:

```bash
cd $HOME/.node-red
npm install node-red-contrib-syslog-input
```

## Usage

To use the node, launch or re-launch Node-RED (see [running Node-RED](http://nodered.org/docs/getting-started/running.html "Running Node-RED") for help getting started).

An example of how you can put this node to use.

![example flow screen shot](https://www.evernote.com/l/AF0BQdMRIVxJR5crx7pQLk15908K4CBIIFQB/image.png "Example of syslog node")

## Configuration Options

The node’s configuration window looks as follows:

![Configuration options using TCP](https://www.evernote.com/l/AF0jKS9VVotAErfOzrpR6F25kpLT4B82P7wB/image.png "TCP Configuration")

The node supports both the UDP and TCP transport protocols.  TCP is generally a good choice, but some older or smaller (i.e. home internet routers) devices may not support TCP.  Raspberry Pi and most other Linux distributions use the [rsyslog](https://www.rsyslog.com/ "rsyslog") software which does support TCP.  

Once you have selected a transport protocol, you need to specify a TCP/UDP port number to listen for requests, and the IP address that you wish to listen on.  

**Note:** The standard port number for the syslog protocol is 514.  On some systems, you may need to run your node-red as root or administrator to access ports below 1024.  This is strongly discouraged.  Thus, it is best to specify a port number above 1024.  Port 20514 is a good choice.

Finally, you need to specify which IP address you wish to _bind_ or _listen_ to for syslog messages. If you leave the IP address blank, then the node will requests for requests on all IP addresses.  This is important if your server has multiple networks, or if you will be receiving messages from both the network, and the built-in localhost interface.  localhost is only accessible to programs running on the local machine.  

## Overview of Syslog Messages
Syslog messages received will be parsed by the node and assigned to the message `payload` as an object, as per the example below.
```json
{
  "facility": "daemon",
  "facilityCode": 3,
  "severity": "info",
  "severityCode": 6,
  "tag": "systemd[1]",
  "timestamp": "2018-12-26T17:53:57.000Z",
  "hostname": "localhost",
  "address": "::ffff:192.168.147.131",
  "family": "IPv6",
  "port": 38514,
  "size": 80,
  "msg": "Started Daily apt download activities."
} 
```

For each message, the topic is set to the tag, without any optional process ids, as per example below.
```json
{  "payload": {    ...    "tag": "systemd[1]",    ...  },  "topic": "systemd"}            
```

`msg.payload` holds the syslog message received from the remote end-point. It is parsed, and structured into a javascript object. All property values are either an `integer` or `string` datatype, with the exception of the `timestamp` property. This property is a native javascript `DateTime` object.
Meanwhile, `msg.topic` holds the `tag` value from the syslog message, but with any process id value and enclosing square braces (e.g. `[1]`) removed. This makes it easy to categorise syslog messages according to the application than generated them.

## Description of Syslog Message Fields
### facility and facilityCode
The _facility_ argument is used to specify what type of program is logging the message. This lets the configuration file specify that messages from different facilities will be handled differently.
There is a [definitive list](https://en.wikipedia.org/wiki/Syslog#Facility) of facilities for syslog. This list can assist you to filter received syslog messages to the ones that most interest you.

### severity and severityCode
There are 8 severity levels. They are:
1. Emergency
2. Alert
3. Critical
4. Error
5. Warning
6. Notice
7. Informational
8. Debug
The meaning of severity levels other than _Emergency_ and _Debug_ are relative to the application. Further information on the severity levels is available from [wikipedia](https://en.wikipedia.org/wiki/Syslog#Severity_level).

### tag
From [RFC3164](https://tools.ietf.org/html/rfc3164#section-5.3):
> It has also been considered to be a good practice to include some information about the process on the device that generated the message - if that concept exists. This is usually the process name and process id (often known as the "pid") for robust operating systems. The process name is commonly displayed in the TAG field. ... The format of "TAG[pid]:" - without the quote marks - is common. The left square bracket is used to terminate the TAG field in this case and is then the first character in the CONTENT field. If the process id is immaterial, it may be left off.
So depending on the software, sometimes the tag field value will have a trailing process id in square brackets, while other times, it won't.

### timestamp
`timestamp` will store the date and time of the message from the source. The timestamp records when the message was created, not when it was received. It will be stored as a native Javascript `DateTime` object.

**Please Note:** Many syslog implementations do not include the year in the timestamp value. In such cases, this node will assume the current year. This is important to note when processing historical syslog messages that may have been generated in previous years. You will need to take this into consideration.

### hostname
The hostname is included in the message sent from the application. It is not determined by the IP address of the remote host, but rather by the local configuration on the sending device. If the sending device does not have an explicitly configured hostname, `localhost` is commonly used.  Edit the `/etc/hostname` file to permanently change the hostname of your hosts.

### address
This field records the IP address of the host that sent or forwarded the message to your node as a string. It is important to recognise that syslog supports message forwarding and that this field value may not necessarily match the originator of the message, but instead the last syslog server host to forward on the message.

### family
The network protocol family representing the IP address is provided by this field. Typically, it will be either `IPv4` or `IPv6`.

### port
This field represents the TCP or UDP transport protocol port number the message was received on as per your node configuration.

### size
`size` will store the size of the entire encoded syslog message. This field is included for completeness, but provides little utility.

### msg
The `msg` field holds the actual text message sent from the remote application.

## Syslog Source Host Configuration
Once you have your node configured, next you will need to tell your servers to send syslog messages to your node.  

[Rsyslog](https://www.rsyslog.com/ "rsyslog") is a very popular open source syslog server for GNU/Linux and comes pre-installed and configured on many distributions. It can be changed such that, in addition to logging messages locally to files, it can also [send syslog messages to a remote host](https://www.rsyslog.com/doc/v8-stable/configuration/modules/omfwd.html), such as your Node Red server. A quick synopsis of making this configuration change is shown below.

Simply edit the `/etc/rsyslog.conf` file, and add the following lines. Editing this file will require root privileges, so don't forget to use `sudo`.

```
#Write all messages to remote syslog using tcp port 20514
*.*  action(type="omfwd" target="192.168.1.8" port="20514" protocol="tcp"
     action.resumeRetryCount="-1"            queue.type="linkedList"
     queue.size="50000")
```

The `*.*` is known as a syslog selector.  It is of the form `facility.priority`. The asterisk is a wildcard meaning matching anything.  Thus, `*.*` matches all messages.  The above configuration will send messages of all facilities and all priorities to the IP address `192.168.1.8` using the TCP transport protocol. If messages can't be delivered to that IP and port number, in the meantime they will be stored locally up to a total of 50,000 messages. Once it is able to connect, messages stored locally will be forwarded.  

Replace `192.168.1.8` with the IP address of your Node Red Server.

**Note:** you will also need to restart your rsyslog server software. Most modern Linux distributions can do this with the following command:

`$ sudo systemctl restart rsyslog`

If you prefer not to queue undelivered messages, use the following configuration.
```
#Write all messages to remote syslog using tcp port 20514
*.*  action(type="omfwd" target="192.168.1.8" port="20514" protocol="tcp"
     queue.type="direct")
```

Using a syslog selector is the traditional method of filtering messages.  However, rsyslog has very [sophisticated filtering functionality](https://www.rsyslog.com/doc/v8-stable/configuration/filters.html "rsyslog filtering").  Yet, for simplicity, you may prefer to filter messages within your flows instead.

### References
- [Syslog Message Format - RFC3164](https://tools.ietf.org/html/rfc3164#section-4)
- [Wikipedia Syslog Page](https://en.wikipedia.org/wiki/Syslog)
- [Rsyslog Message Forwarding Options](https://www.rsyslog.com/doc/v8-stable/configuration/modules/omfwd.html)

## Troubleshooting

![Incorrect IP address](https://www.evernote.com/l/AF1GHeDUi4lJUIs4sGyftsqUxfq0uQhYO6kB/image.png "EADDRNOTAVAIL")

`EADDRNOTAVAIL` means that the IP address you specified for the node is incorrect.  You can check the ip address of your local system using the following command (GNU/Linux):

```bash
ip addr
```

On macOS:

```bash
ifconfig
```

If your Node Red server only has one network connection, then you can safely leave the `address` field blank.

![Root permissions required](https://www.evernote.com/l/AF18fHGlKHVGYp70lVPD7Rew8vpnpuYm8L4B/image.png "EACCESS")

This error indicates that the port number 514 is privileged and requires root permissions to listen upon.  While you can run your node-red server as root, this is strongly discouraged for security reasons.  Instead, change your port number to one above 1024.  20514 is a simple option.

## Licence
Copyright (c) 2019 Damien Clark

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0 "Apache Licence")

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## Acknowledgements

Like others who stand on the shoulders of giants, I'd like to acknowledge
the contributions of the following people/groups without which, more directly,
this modest Node-RED node would not be possible.

- [Mark Eschbach](https://github.com/meschbach "Mark Eschbach") and [chunpu](https://github.com/chunpu "chunpu") for their [initial work](https://github.com/meschbach/syslogd) on a node.js implementation of syslog on which [I forked](https://github.com/damoclark/simple-syslog-server "simple syslog server").
-  Nick O'Leary and Dave Conway-Jones for creating [Node-Red](http://nodered.org/about/)
