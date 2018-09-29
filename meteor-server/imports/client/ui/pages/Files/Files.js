import React, { Component } from "react";
import PropTypes from "prop-types";
import { Table, Button } from "react-bootstrap";
import styled from "styled-components";
import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";
import { Bert } from "meteor/themeteorchef:bert";
import Loading from "../../components/Loading/Loading";
import BlankState from "../../components/BlankState/BlankState";
import FilesCollection from "../../../../api/Files/Files";

const StyledDocuments = styled.div`
  table tbody tr td {
    vertical-align: middle;
  }
`;

class Files extends Component {
  constructor(props) {
    super(props);

    this.state = {
      uploading: [],
      progress: 0,
      inProgress: false
    };
  }

  handleRemove = fileId => {
    if (confirm("Are you sure? This is permanent!")) {
      Meteor.call("files.remove", { selectedIndexes: [fileId] }, error => {
        if (error) {
          Bert.alert(error.reason, "danger");
        } else {
          Bert.alert("File deleted!", "success");
        }
      });
    }
  };

  handleFileDialog = () => {
    this.fileinput.click();
  };

  uploadFile = e => {
    e.preventDefault();

    let self = this;

    if (e.currentTarget.files && e.currentTarget.files[0]) {
      const file = e.currentTarget.files[0];

      if (file) {
        const uploadInstance = FilesCollection.insert(
          {
            file,
            meta: {
              userId: Meteor.userId(), // Used to check on server for file tampering
              uploadFolder: "react-native-uploads", // Set the destination folder in the storage
              fileType: "image", // Used to check correct uploaded file type
              shouldResize: false // If image, do resize
            },
            streams: "dynamic",
            chunkSize: "dynamic",
            allowWebWorkers: true // If you see issues with uploads, change this to false
          },
          false
        );

        this.setState({
          uploading: uploadInstance, // Keep track of this instance to use below
          inProgress: true // Show the progress bar now
        });

        // These are the event functions, don't need most of them, it shows where we are in the process
        uploadInstance.on("start", function() {
          console.log("Starting");
        });

        uploadInstance.on("end", function(error, fileObj) {
          console.log("On end File Object:", fileObj);
        });

        uploadInstance.on("uploaded", function(error, fileObj) {
          console.log("uploaded:", fileObj);

          // Remove the filename from the upload box
          self.fileinput.value = "";

          // Reset our state for the next file
          self.setState({
            uploading: [],
            progress: 0,
            inProgress: false
          });
        });

        uploadInstance.on("error", function(error, fileObj) {
          console.log("Error during upload:", error);
        });

        uploadInstance.on("progress", function(progress, fileObj) {
          console.log("Upload Percentage:", progress);

          // Update our progress bar
          self.setState({
            progress: progress
          });
        });

        uploadInstance.start(); // Must manually start the upload
      }
    }
  };

  render() {
    const { loading, files, match, history } = this.props;

    return !loading ? (
      <StyledDocuments>
        <div className="page-header clearfix">
          <h4 className="pull-left">Files</h4>
          <Button
            className="btn btn-success pull-right"
            onClick={this.handleFileDialog}
          >
            Add File
          </Button>
        </div>
        {files.length ? (
          <Table responsive>
            <thead>
              <tr>
                <th>Mime Type</th>
                <th>Weight</th>
                <th>Name</th>
                <th colSpan="2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file._id}>
                  <td>{file.type}</td>
                  <td>
                    {Math.ceil((file.size / 1024 / 1024) * Math.pow(10, 2)) /
                      Math.pow(10, 2)}{" "}
                    MB
                  </td>
                  <td>{file.name}</td>
                  <td>
                    <Button
                      bsStyle="primary"
                      onClick={() =>
                        (window.location = `${FilesCollection.link(
                          file
                        )}?download=true`)
                      }
                      block
                    >
                      Download
                    </Button>
                  </td>
                  <td>
                    <Button
                      bsStyle="danger"
                      onClick={() => this.handleRemove(file._id)}
                      block
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div>
            <BlankState
              icon={{ style: "solid", symbol: "file-alt" }}
              title="You're plum out of files, friend!"
              subtitle="Add your first file by clicking the button below."
              action={{
                style: "success",
                onClick: this.handleFileDialog,
                label: "Create Your First File"
              }}
            />
          </div>
        )}

        <input
          type="file"
          id="fileinput"
          name="imageUpload"
          disabled={this.state.inProgress}
          ref={c => (this.fileinput = c)}
          onChange={this.uploadFile}
          accept="image/png, image/jpeg, image/gif"
          style={{ display: "none", visibility: "hidden" }}
        />
      </StyledDocuments>
    ) : (
      <Loading />
    );
  }
}

Files.propTypes = {
  loading: PropTypes.bool.isRequired,
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  match: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired
};

export default withTracker(() => {
  const subscription = Meteor.subscribe("files.all");
  return {
    loading: !subscription.ready(),
    files: FilesCollection.find({}, { sort: { name: 1 } }).fetch()
  };
})(Files);
